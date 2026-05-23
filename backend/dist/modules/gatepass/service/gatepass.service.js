"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGatepass = exports.updateGatepassStatus = exports.createGatepass = exports.getYearlyLunchReport = exports.getMonthlyLunchReport = exports.getDailyLunchReport = exports.getLunchEmployeeDetailReport = exports.getLunchAnalyticsRangeReport = exports.getLiveEmployeeStatuses = exports.getGatepassStats = exports.getGatepassById = exports.searchGatepasses = exports.getTodaysGatepasses = exports.getGatepasses = exports.getGatepassReasons = void 0;
const database_1 = require("../../../config/database");
const env_1 = require("../../../config/env");
const socket_1 = require("../../../realtime/socket");
const WORKDAY_START_HOUR = 9;
const WORKDAY_END_HOUR = 18;
const LUNCH_REASON_NAME = 'lunch';
const LUNCH_LIMIT_MINUTES = env_1.env.TIME_FOR_LUNCH_MINUTES;
const optionalString = (value) => {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
};
const toApprovalRequests = (value) => {
    if (Array.isArray(value))
        return value;
    return [];
};
const rowToGatepass = (row) => ({
    id: String(row.id),
    user_id: String(row.user_id),
    reason_id: String(row.reason_id),
    reason_name: String(row.reason_name),
    display_reason: String(row.display_reason),
    reason_description: optionalString(row.reason_description),
    destination: optionalString(row.destination),
    date: String(row.date),
    status: row.status,
    approval_flow: row.approval_flow,
    rejection_reason: optionalString(row.rejection_reason),
    is_emergency: Boolean(row.is_emergency),
    checked_out_at: optionalString(row.checked_out_at),
    checked_out_by: optionalString(row.checked_out_by),
    checked_in_at: optionalString(row.checked_in_at),
    checked_in_by: optionalString(row.checked_in_by),
    total_minutes_outside: Number(row.total_minutes_outside ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
});
const withProfile = (row) => ({
    ...rowToGatepass(row),
    profiles: row.profile_name
        ? {
            name: String(row.profile_name),
            email: String(row.profile_email),
            department: optionalString(row.profile_department),
            manager_id: optionalString(row.profile_manager_id),
        }
        : undefined,
    approval_requests: toApprovalRequests(row.approval_requests),
});
const BASE_QUERY = `
  SELECT
    g.id,
    g.user_id,
    g.reason_id,
    gr.name AS reason_name,
    g.reason_description,
    g.destination,
    g.date,
    g.status,
    g.approval_flow,
    g.rejection_reason,
    g.is_emergency,
    g.checked_out_at,
    g.checked_out_by,
    g.checked_in_at,
    g.checked_in_by,
    g.total_minutes_outside,
    g.created_at,
    g.updated_at,
    u.name AS profile_name,
    u.email AS profile_email,
    d.name AS profile_department,
    u.manager_id AS profile_manager_id,
    CASE
      WHEN COALESCE(NULLIF(TRIM(g.reason_description), ''), '') <> '' THEN CONCAT(gr.name, ': ', g.reason_description)
      ELSE gr.name
    END AS display_reason,
    COALESCE(
      json_agg(
        json_build_object(
          'id', gar.id,
          'gatepass_id', gar.gatepass_id,
          'approver_user_id', gar.approver_user_id,
          'approver_role', gar.approver_role,
          'step', gar.step,
          'status', gar.status,
          'remarks', gar.remarks,
          'acted_at', gar.acted_at,
          'created_at', gar.created_at,
          'updated_at', gar.updated_at
        )
        ORDER BY gar.step
      ) FILTER (WHERE gar.id IS NOT NULL),
      '[]'::json
    ) AS approval_requests
  FROM gatepasses g
  JOIN gatepass_reasons gr ON gr.id = g.reason_id
  LEFT JOIN users u ON u.id = g.user_id
  LEFT JOIN departments d ON d.id = u.department_id
  LEFT JOIN gatepass_approval_requests gar ON gar.gatepass_id = g.id
`;
const GROUP_BY = `
  GROUP BY g.id, gr.name, u.id, d.name
`;
const buildVisibilityClause = (role, userId, startingParamIndex) => {
    switch (role) {
        case 'employee':
        case 'guest':
            return {
                clause: `g.user_id = $${startingParamIndex}`,
                params: [userId],
            };
        case 'manager':
            return {
                clause: `(g.user_id = $${startingParamIndex} OR EXISTS (
          SELECT 1
          FROM gatepass_approval_requests gar_scope
          WHERE gar_scope.gatepass_id = g.id
            AND gar_scope.approver_user_id = $${startingParamIndex}
        ))`,
                params: [userId],
            };
        default:
            return { params: [] };
    }
};
const buildQuery = (conditions) => {
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    return `${BASE_QUERY}${where}${GROUP_BY} ORDER BY g.created_at DESC`;
};
const runGatepassQuery = async (db, conditions, params) => {
    const result = await db.query(buildQuery(conditions), params);
    return result.rows.map(withProfile);
};
const getGatepassByIdInternal = async (db, id) => {
    const result = await db.query(`${BASE_QUERY} WHERE g.id = $1${GROUP_BY}`, [id]);
    const row = result.rows[0];
    if (!row)
        throw new Error('Gatepass not found');
    return withProfile(row);
};
const getRequesterContext = async (db, userId) => {
    const result = await db.query(`SELECT u.id, r.name AS role, u.manager_id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`, [userId]);
    const row = result.rows[0];
    if (!row)
        throw new Error('Requester not found');
    return {
        id: String(row.id),
        role: row.role,
        manager_id: optionalString(row.manager_id),
    };
};
const getPrimaryAdminId = async (db) => {
    const result = await db.query(`SELECT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'admin'
     ORDER BY u.created_at ASC
     LIMIT 1`);
    const row = result.rows[0];
    if (!row)
        throw new Error('No admin user configured');
    return String(row.id);
};
const resolveReason = async (db, input) => {
    if (input.reason_id) {
        const result = await db.query(`SELECT id, name
       FROM gatepass_reasons
       WHERE id = $1`, [input.reason_id]);
        const row = result.rows[0];
        if (!row)
            throw new Error('Invalid gatepass reason');
        return row;
    }
    const reasonName = optionalString(input.reason_name);
    if (!reasonName) {
        throw new Error('reason_id is required');
    }
    const result = await db.query(`SELECT id, name
     FROM gatepass_reasons
     WHERE LOWER(name) = LOWER($1)`, [reasonName]);
    const row = result.rows[0];
    if (!row)
        throw new Error('Invalid gatepass reason');
    return row;
};
const getPendingApprovalForActor = async (db, gatepassId, actorUserId, approverRole) => {
    const result = await db.query(`SELECT id, gatepass_id, approver_user_id, approver_role, step, status,
            remarks, acted_at, created_at, updated_at
     FROM gatepass_approval_requests
     WHERE gatepass_id = $1
       AND approver_user_id = $2
       AND approver_role = $3
     LIMIT 1`, [gatepassId, actorUserId, approverRole]);
    const row = result.rows[0];
    if (!row)
        throw new Error(`No ${approverRole} approval request found for this gatepass`);
    return row;
};
const getApprovalRequestByStep = async (db, gatepassId, step) => {
    const result = await db.query(`SELECT id, gatepass_id, approver_user_id, approver_role, step, status,
            remarks, acted_at, created_at, updated_at
     FROM gatepass_approval_requests
     WHERE gatepass_id = $1
       AND step = $2
     LIMIT 1`, [gatepassId, step]);
    const row = result.rows[0];
    if (!row)
        throw new Error(`No approval request found for step ${step}`);
    return row;
};
const cancelPendingApprovalRequests = async (db, gatepassId, remarks) => {
    await db.query(`UPDATE gatepass_approval_requests
     SET status = 'cancelled',
         remarks = COALESCE(remarks, $2),
         updated_at = NOW()
     WHERE gatepass_id = $1
       AND status = 'pending'`, [gatepassId, remarks]);
};
const calculateWorkingMinutesOutside = (checkedOutAt, checkedInAt) => {
    if (checkedInAt <= checkedOutAt)
        return 0;
    let totalMinutes = 0;
    let cursor = new Date(checkedOutAt);
    while (cursor < checkedInAt) {
        const workdayStart = new Date(cursor);
        workdayStart.setHours(WORKDAY_START_HOUR, 0, 0, 0);
        const workdayEnd = new Date(cursor);
        workdayEnd.setHours(WORKDAY_END_HOUR, 0, 0, 0);
        const overlapStart = new Date(Math.max(checkedOutAt.getTime(), workdayStart.getTime()));
        const overlapEnd = new Date(Math.min(checkedInAt.getTime(), workdayEnd.getTime()));
        if (overlapEnd > overlapStart) {
            totalMinutes += Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 60000);
        }
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(0, 0, 0, 0);
    }
    return Math.max(totalMinutes, 0);
};
const emitRealtimeUpdate = (gatepass, eventName) => {
    if (eventName) {
        (0, socket_1.emitGatepassSocketEvent)(eventName, gatepass);
    }
    (0, socket_1.emitGatepassSocketEvent)('gatepass:status-updated', gatepass);
};
const parseTimestamp = (value) => {
    if (!value)
        return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};
const calculateMinutesBetween = (startValue, endValue, fallbackEnd) => {
    const start = parseTimestamp(startValue);
    if (!start)
        return 0;
    const end = endValue ? parseTimestamp(endValue) : (fallbackEnd ?? null);
    if (!end)
        return 0;
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
};
const calculateExtraLunchMinutes = (durationMinutes) => Math.max(0, durationMinutes - LUNCH_LIMIT_MINUTES);
const parseDateParam = (value, fallback) => {
    if (!value)
        return fallback.toISOString().slice(0, 10);
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return fallback.toISOString().slice(0, 10);
    return parsed.toISOString().slice(0, 10);
};
const parseMonthParam = (value) => {
    const now = new Date();
    const match = value?.match(/^(\d{4})-(\d{2})$/);
    const year = match ? parseInt(match[1], 10) : now.getFullYear();
    const monthIndex = match ? Math.max(0, Math.min(11, parseInt(match[2], 10) - 1)) : now.getMonth();
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    return {
        monthLabel: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
    };
};
const parseYearParam = (value) => {
    const now = new Date();
    const year = value && /^\d{4}$/.test(value) ? parseInt(value, 10) : now.getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    return {
        year,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
    };
};
const normalizeDateRange = (startDateParam, endDateParam) => {
    const now = new Date();
    const fallback = now.toISOString().slice(0, 10);
    const startDate = parseDateParam(startDateParam, now);
    const endDate = parseDateParam(endDateParam, now);
    return startDate <= endDate
        ? { startDate, endDate }
        : { startDate: endDate || fallback, endDate: startDate || fallback };
};
const getLiveEmployeeStatusesInternal = async (db, employeeId) => {
    const params = [];
    const employeeFilter = employeeId ? ' AND u.id = $1' : '';
    if (employeeId)
        params.push(employeeId);
    const result = await db.query(`SELECT
       u.id AS user_id,
       u.name AS employee_name,
       d.name AS department,
       active.reason_name AS active_reason_name,
       active.checked_out_at,
       active.checked_in_at
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN LATERAL (
       SELECT
         gr.name AS reason_name,
         g.checked_out_at,
         g.checked_in_at
       FROM gatepasses g
       JOIN gatepass_reasons gr ON gr.id = g.reason_id
       WHERE g.user_id = u.id
         AND g.checked_out_at IS NOT NULL
         AND g.checked_in_at IS NULL
       ORDER BY g.checked_out_at DESC NULLS LAST, g.created_at DESC
       LIMIT 1
     ) active ON TRUE
     WHERE r.name IN ('employee', 'manager')
     ${employeeFilter}
     ORDER BY u.name`, params);
    return result.rows.map((row) => {
        const activeReasonName = optionalString(row.active_reason_name);
        const checkedOutAt = optionalString(row.checked_out_at);
        const checkedInAt = optionalString(row.checked_in_at);
        const onLunch = activeReasonName?.toLowerCase() === LUNCH_REASON_NAME && !!checkedOutAt && !checkedInAt;
        const currentStatus = onLunch
            ? 'On Lunch'
            : checkedOutAt && !checkedInAt
                ? 'Outside Office'
                : 'In Office';
        const lunchDurationMinutes = onLunch
            ? calculateMinutesBetween(checkedOutAt, undefined, new Date())
            : 0;
        return {
            user_id: String(row.user_id),
            employee_name: String(row.employee_name),
            department: optionalString(row.department),
            current_status: currentStatus,
            active_reason_name: activeReasonName,
            checked_out_at: checkedOutAt,
            checked_in_at: checkedInAt,
            lunch_duration_minutes: lunchDurationMinutes,
            extra_lunch_minutes: calculateExtraLunchMinutes(lunchDurationMinutes),
        };
    });
};
const getLunchEntriesInRange = async (db, startDate, endDate, employeeId) => {
    const params = [startDate, endDate];
    const employeeFilter = employeeId ? ' AND u.id = $3' : '';
    if (employeeId)
        params.push(employeeId);
    const result = await db.query(`SELECT
       u.id AS user_id,
       u.name AS employee_name,
       d.name AS department,
       g.id,
       g.date,
       gr.name AS reason_name,
       g.status,
       g.checked_out_at,
       g.checked_in_at,
       g.total_minutes_outside
     FROM gatepasses g
     JOIN gatepass_reasons gr ON gr.id = g.reason_id
     JOIN users u ON u.id = g.user_id
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE g.date BETWEEN $1 AND $2
       AND r.name IN ('employee', 'manager')
       AND (
         g.checked_out_at IS NOT NULL
         OR g.checked_in_at IS NOT NULL
         OR g.total_minutes_outside > 0
         OR g.status IN ('active', 'completed')
       )
       ${employeeFilter}
     ORDER BY u.name, g.date DESC, g.checked_out_at DESC NULLS LAST, g.created_at DESC`, params);
    return result.rows.map((row) => ({
        user_id: String(row.user_id),
        employee_name: String(row.employee_name),
        department: optionalString(row.department),
        id: String(row.id),
        date: String(row.date),
        reason_name: String(row.reason_name),
        status: row.status,
        checked_out_at: optionalString(row.checked_out_at),
        checked_in_at: optionalString(row.checked_in_at),
        total_minutes_outside: Number(row.total_minutes_outside ?? 0),
    }));
};
const getEmployeeActivityLogsInRange = async (db, userId, startDate, endDate) => {
    const result = await db.query(`SELECT
       g.id,
       g.date,
       gr.name AS reason_name,
       g.reason_description,
       g.status,
       g.checked_out_at,
       g.checked_in_at,
       g.total_minutes_outside
     FROM gatepasses g
     JOIN gatepass_reasons gr ON gr.id = g.reason_id
     WHERE g.user_id = $1
       AND g.date BETWEEN $2 AND $3
       AND (
         g.checked_out_at IS NOT NULL
         OR g.checked_in_at IS NOT NULL
         OR g.total_minutes_outside > 0
       )
     ORDER BY g.date DESC, g.checked_out_at DESC NULLS LAST, g.created_at DESC`, [userId, startDate, endDate]);
    return result.rows.map((row) => {
        const reasonName = String(row.reason_name);
        const checkedOutAt = optionalString(row.checked_out_at);
        const checkedInAt = optionalString(row.checked_in_at);
        const lunchDurationMinutes = reasonName.toLowerCase() === LUNCH_REASON_NAME
            ? calculateMinutesBetween(checkedOutAt, checkedInAt, new Date())
            : 0;
        const extraLunchMinutes = reasonName.toLowerCase() === LUNCH_REASON_NAME
            ? calculateExtraLunchMinutes(lunchDurationMinutes)
            : 0;
        return {
            id: String(row.id),
            date: String(row.date),
            reason_name: reasonName,
            reason_description: optionalString(row.reason_description),
            status: row.status,
            checked_out_at: checkedOutAt,
            checked_in_at: checkedInAt,
            total_outside_office_minutes: Number(row.total_minutes_outside ?? 0),
            lunch_duration_minutes: lunchDurationMinutes,
            extra_lunch_minutes: extraLunchMinutes,
            violation: extraLunchMinutes > 0,
        };
    });
};
const buildLunchEmployeeSummaries = (liveStatuses, entries) => {
    const summaries = new Map();
    for (const liveStatus of liveStatuses) {
        summaries.set(liveStatus.user_id, {
            user_id: liveStatus.user_id,
            employee_name: liveStatus.employee_name,
            department: liveStatus.department,
            checked_out_at: liveStatus.current_status === 'On Lunch' ? liveStatus.checked_out_at : undefined,
            checked_in_at: liveStatus.current_status === 'On Lunch' ? liveStatus.checked_in_at : undefined,
            current_status: liveStatus.current_status,
            total_lunch_duration_minutes: 0,
            total_extra_lunch_minutes: 0,
            violation_count: 0,
            entries: [],
        });
    }
    for (const entry of entries) {
        const isLunchEntry = entry.reason_name.trim().toLowerCase() === LUNCH_REASON_NAME;
        const durationMinutes = isLunchEntry
            ? calculateMinutesBetween(entry.checked_out_at, entry.checked_in_at, new Date())
            : 0;
        const extraLunchMinutes = isLunchEntry ? calculateExtraLunchMinutes(durationMinutes) : 0;
        const entryCurrentStatus = entry.checked_out_at && !entry.checked_in_at
            ? (isLunchEntry ? 'On Lunch' : 'Outside Office')
            : 'In Office';
        const lunchEntry = {
            id: entry.id,
            date: entry.date,
            reason_name: entry.reason_name,
            current_status: entryCurrentStatus,
            checked_out_at: entry.checked_out_at,
            checked_in_at: entry.checked_in_at,
            total_outside_office_minutes: entry.total_minutes_outside,
            lunch_duration_minutes: durationMinutes,
            extra_lunch_minutes: extraLunchMinutes,
        };
        const existing = summaries.get(entry.user_id) ?? {
            user_id: entry.user_id,
            employee_name: entry.employee_name,
            department: entry.department,
            checked_out_at: entry.checked_out_at,
            checked_in_at: entry.checked_in_at,
            current_status: 'In Office',
            total_lunch_duration_minutes: 0,
            total_extra_lunch_minutes: 0,
            violation_count: 0,
            entries: [],
        };
        existing.entries.push(lunchEntry);
        if (isLunchEntry) {
            existing.total_lunch_duration_minutes += durationMinutes;
            existing.total_extra_lunch_minutes += extraLunchMinutes;
            existing.violation_count += extraLunchMinutes > 0 ? 1 : 0;
        }
        const currentCheckedOutAt = parseTimestamp(existing.checked_out_at);
        const nextCheckedOutAt = parseTimestamp(entry.checked_out_at);
        if (nextCheckedOutAt && (!currentCheckedOutAt || nextCheckedOutAt > currentCheckedOutAt)) {
            existing.checked_out_at = entry.checked_out_at;
            existing.checked_in_at = entry.checked_in_at;
        }
        summaries.set(entry.user_id, existing);
    }
    return [...summaries.values()].sort((left, right) => left.employee_name.localeCompare(right.employee_name));
};
const getTopLunchViolators = (employees) => [...employees]
    .filter((employee) => employee.total_extra_lunch_minutes > 0)
    .sort((left, right) => {
    if (right.total_extra_lunch_minutes !== left.total_extra_lunch_minutes) {
        return right.total_extra_lunch_minutes - left.total_extra_lunch_minutes;
    }
    return right.violation_count - left.violation_count;
})
    .slice(0, 5);
const filterEmployeesWithHistory = (employees) => employees.filter((employee) => employee.entries.length > 0);
const buildLunchAnalyticsRangeReport = async (startDate, endDate, employeeId) => {
    const liveStatuses = await getLiveEmployeeStatusesInternal((0, database_1.getDb)(), employeeId);
    const entries = await getLunchEntriesInRange((0, database_1.getDb)(), startDate, endDate, employeeId);
    const employees = filterEmployeesWithHistory(buildLunchEmployeeSummaries(liveStatuses, entries));
    const totalViolations = employees.reduce((total, employee) => total + employee.violation_count, 0);
    return {
        start_date: startDate,
        end_date: endDate,
        allowed_lunch_minutes: LUNCH_LIMIT_MINUTES,
        employees,
        total_violations: totalViolations,
        top_employees: getTopLunchViolators(employees),
    };
};
const getGatepassReasons = async () => {
    const result = await (0, database_1.getDb)().query(`SELECT id, name
     FROM gatepass_reasons
     ORDER BY CASE LOWER(name)
       WHEN 'lunch' THEN 1
       WHEN 'out' THEN 2
       ELSE 3
     END, name`);
    return result.rows;
};
exports.getGatepassReasons = getGatepassReasons;
const getGatepasses = async (userId, role) => {
    const visibility = buildVisibilityClause(role, userId, 1);
    const conditions = visibility.clause ? [visibility.clause] : [];
    return runGatepassQuery((0, database_1.getDb)(), conditions, visibility.params);
};
exports.getGatepasses = getGatepasses;
const getTodaysGatepasses = async (userId, role) => {
    const today = new Date().toISOString().slice(0, 10);
    const conditions = ['g.date = $1'];
    const params = [today];
    const visibility = buildVisibilityClause(role, userId, params.length + 1);
    if (visibility.clause) {
        conditions.push(visibility.clause);
        params.push(...visibility.params);
    }
    return runGatepassQuery((0, database_1.getDb)(), conditions, params);
};
exports.getTodaysGatepasses = getTodaysGatepasses;
const searchGatepasses = async (query, userId, role) => {
    const like = `%${query.trim()}%`;
    const conditions = [
        `(gr.name ILIKE $1
      OR COALESCE(g.reason_description, '') ILIKE $2
      OR COALESCE(g.destination, '') ILIKE $3
      OR COALESCE(u.name, '') ILIKE $4
      OR g.id::text ILIKE $5)`,
    ];
    const params = [like, like, like, like, like];
    const visibility = buildVisibilityClause(role, userId, params.length + 1);
    if (visibility.clause) {
        conditions.push(visibility.clause);
        params.push(...visibility.params);
    }
    return runGatepassQuery((0, database_1.getDb)(), conditions, params);
};
exports.searchGatepasses = searchGatepasses;
const getGatepassById = async (id, actorUserId, actorRole) => {
    const gatepasses = await runGatepassQuery((0, database_1.getDb)(), [
        'g.id = $1',
        ...(buildVisibilityClause(actorRole, actorUserId, 2).clause
            ? [buildVisibilityClause(actorRole, actorUserId, 2).clause]
            : []),
    ], [
        id,
        ...buildVisibilityClause(actorRole, actorUserId, 2).params,
    ]);
    const gatepass = gatepasses[0];
    if (!gatepass)
        throw new Error('Gatepass not found');
    return gatepass;
};
exports.getGatepassById = getGatepassById;
const getGatepassStats = async (userId, role) => {
    const visibility = buildVisibilityClause(role, userId, 1);
    const where = visibility.clause ? ` WHERE ${visibility.clause}` : '';
    const result = await (0, database_1.getDb)().query(`SELECT g.status, COUNT(*)::int AS count
     FROM gatepasses g
     ${where}
     GROUP BY g.status`, visibility.params);
    const stats = {
        total: 0,
        pending: 0,
        pending_manager_approval: 0,
        pending_admin_approval: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
        active: 0,
        completed: 0,
    };
    for (const row of result.rows) {
        const status = row.status;
        const count = Number(row.count ?? 0);
        switch (status) {
            case 'pending':
                stats.pending += count;
                break;
            case 'pending_manager_approval':
                stats.pending_manager_approval = count;
                stats.pending += count;
                break;
            case 'pending_admin_approval':
                stats.pending_admin_approval = count;
                stats.pending += count;
                break;
            case 'approved':
                stats.approved = count;
                break;
            case 'rejected':
                stats.rejected = count;
                break;
            case 'cancelled':
                stats.cancelled = count;
                break;
            case 'active':
                stats.active = count;
                break;
            case 'completed':
                stats.completed = count;
                break;
        }
        stats.total += count;
    }
    return stats;
};
exports.getGatepassStats = getGatepassStats;
const getLiveEmployeeStatuses = async (employeeId) => getLiveEmployeeStatusesInternal((0, database_1.getDb)(), employeeId);
exports.getLiveEmployeeStatuses = getLiveEmployeeStatuses;
const getLunchAnalyticsRangeReport = async (startDateParam, endDateParam, employeeId) => {
    const { startDate, endDate } = normalizeDateRange(startDateParam, endDateParam);
    return buildLunchAnalyticsRangeReport(startDate, endDate, employeeId);
};
exports.getLunchAnalyticsRangeReport = getLunchAnalyticsRangeReport;
const getLunchEmployeeDetailReport = async (userId, startDateParam, endDateParam) => {
    const { startDate, endDate } = normalizeDateRange(startDateParam, endDateParam);
    const rangeReport = await buildLunchAnalyticsRangeReport(startDate, endDate, userId);
    const liveStatuses = await getLiveEmployeeStatusesInternal((0, database_1.getDb)(), userId);
    const liveStatus = liveStatuses[0];
    const employeeSummary = rangeReport.employees[0];
    const activityLogs = await getEmployeeActivityLogsInRange((0, database_1.getDb)(), userId, startDate, endDate);
    if (!employeeSummary && !liveStatus) {
        throw new Error('Employee lunch history not found');
    }
    return {
        user_id: userId,
        employee_name: employeeSummary?.employee_name ?? liveStatus?.employee_name ?? 'Unknown Employee',
        department: employeeSummary?.department ?? liveStatus?.department,
        start_date: startDate,
        end_date: endDate,
        current_status: employeeSummary?.current_status ?? liveStatus?.current_status ?? 'In Office',
        checked_out_at: employeeSummary?.checked_out_at ?? liveStatus?.checked_out_at,
        checked_in_at: employeeSummary?.checked_in_at ?? liveStatus?.checked_in_at,
        total_lunch_duration_minutes: employeeSummary?.total_lunch_duration_minutes ?? 0,
        total_extra_lunch_minutes: employeeSummary?.total_extra_lunch_minutes ?? 0,
        total_outside_office_minutes: activityLogs.reduce((total, log) => total + log.total_outside_office_minutes, 0),
        violation_count: employeeSummary?.violation_count ?? 0,
        lunch_entries: employeeSummary?.entries.filter((entry) => entry.reason_name.toLowerCase() === LUNCH_REASON_NAME) ?? [],
        activity_logs: activityLogs,
    };
};
exports.getLunchEmployeeDetailReport = getLunchEmployeeDetailReport;
const getDailyLunchReport = async (dateParam, employeeId) => {
    const date = parseDateParam(dateParam, new Date());
    const rangeReport = await buildLunchAnalyticsRangeReport(date, date, employeeId);
    return {
        date,
        allowed_lunch_minutes: rangeReport.allowed_lunch_minutes,
        employees: rangeReport.employees,
        total_violations: rangeReport.total_violations,
    };
};
exports.getDailyLunchReport = getDailyLunchReport;
const getMonthlyLunchReport = async (monthParam, employeeId) => {
    const { monthLabel, startDate, endDate } = parseMonthParam(monthParam);
    const rangeReport = await buildLunchAnalyticsRangeReport(startDate, endDate, employeeId);
    return {
        month: monthLabel,
        allowed_lunch_minutes: rangeReport.allowed_lunch_minutes,
        employees: rangeReport.employees,
        total_violations: rangeReport.total_violations,
        top_employees: rangeReport.top_employees,
    };
};
exports.getMonthlyLunchReport = getMonthlyLunchReport;
const getYearlyLunchReport = async (yearParam, employeeId) => {
    const { year, startDate, endDate } = parseYearParam(yearParam);
    const liveStatuses = await getLiveEmployeeStatusesInternal((0, database_1.getDb)(), employeeId);
    const entries = await getLunchEntriesInRange((0, database_1.getDb)(), startDate, endDate, employeeId);
    const employees = filterEmployeesWithHistory(buildLunchEmployeeSummaries(liveStatuses, entries));
    const monthMap = new Map();
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const monthLabel = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
        monthMap.set(monthLabel, {
            month: monthLabel,
            total_extra_lunch_minutes: 0,
            violation_count: 0,
        });
    }
    for (const entry of entries) {
        if (entry.reason_name.trim().toLowerCase() !== LUNCH_REASON_NAME) {
            continue;
        }
        const checkedOutAt = parseTimestamp(entry.checked_out_at);
        const monthLabel = checkedOutAt
            ? `${checkedOutAt.getFullYear()}-${String(checkedOutAt.getMonth() + 1).padStart(2, '0')}`
            : String(entry.date).slice(0, 7);
        const durationMinutes = calculateMinutesBetween(entry.checked_out_at, entry.checked_in_at, new Date());
        const extraLunchMinutes = calculateExtraLunchMinutes(durationMinutes);
        const existing = monthMap.get(monthLabel) ?? {
            month: monthLabel,
            total_extra_lunch_minutes: 0,
            violation_count: 0,
        };
        existing.total_extra_lunch_minutes += extraLunchMinutes;
        existing.violation_count += extraLunchMinutes > 0 ? 1 : 0;
        monthMap.set(monthLabel, existing);
    }
    const months = [...monthMap.values()].sort((left, right) => left.month.localeCompare(right.month));
    const totalViolations = employees.reduce((total, employee) => total + employee.violation_count, 0);
    return {
        year,
        allowed_lunch_minutes: LUNCH_LIMIT_MINUTES,
        employees,
        months,
        total_violations: totalViolations,
        top_employees: getTopLunchViolators(employees),
    };
};
exports.getYearlyLunchReport = getYearlyLunchReport;
const createGatepass = async (userId, input) => {
    const pool = (0, database_1.getDb)();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const requester = await getRequesterContext(client, userId);
        const reason = await resolveReason(client, input);
        const reasonDescription = optionalString(input.reason_description);
        const normalizedReason = reason.name.trim().toLowerCase();
        const requiresReasonDescription = normalizedReason !== 'lunch';
        if (requiresReasonDescription && !reasonDescription) {
            throw new Error('Please enter reason description');
        }
        const approvalFlow = requester.role === 'employee' && normalizedReason === 'out'
            ? 'manager_then_admin'
            : 'admin_only';
        const initialStatus = approvalFlow === 'manager_then_admin' ? 'pending_manager_approval' : 'pending_admin_approval';
        if (approvalFlow === 'manager_then_admin' && !requester.manager_id) {
            throw new Error('No manager is assigned to this employee');
        }
        const adminUserId = await getPrimaryAdminId(client);
        const requestDate = input.date ?? new Date().toISOString().slice(0, 10);
        const inserted = await client.query(`INSERT INTO gatepasses (
         user_id,
         reason_id,
         reason_description,
         destination,
         date,
         status,
         approval_flow,
         is_emergency
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`, [
            userId,
            reason.id,
            reasonDescription ?? null,
            input.destination ?? null,
            requestDate,
            initialStatus,
            approvalFlow,
            input.is_emergency ?? false,
        ]);
        const gatepassDbId = String(inserted.rows[0].id);
        if (approvalFlow === 'manager_then_admin') {
            await client.query(`INSERT INTO gatepass_approval_requests (
           gatepass_id,
           approver_user_id,
           approver_role,
           step,
           status
         )
         VALUES ($1, $2, 'manager', 1, 'pending')`, [gatepassDbId, requester.manager_id]);
        }
        await client.query(`INSERT INTO gatepass_approval_requests (
         gatepass_id,
         approver_user_id,
         approver_role,
         step,
         status
       )
       VALUES ($1, $2, 'admin', 2, 'pending')`, [gatepassDbId, adminUserId]);
        await client.query('COMMIT');
        const createdGatepass = await getGatepassByIdInternal((0, database_1.getDb)(), gatepassDbId);
        emitRealtimeUpdate(createdGatepass, 'gatepass:new-request');
        return createdGatepass;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
exports.createGatepass = createGatepass;
const updateGatepassStatus = async (id, input, actorUserId, actorRole) => {
    const pool = (0, database_1.getDb)();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const gatepass = await getGatepassByIdInternal(client, id);
        const nowIso = new Date().toISOString();
        const rejectReason = input.rejection_reason ?? input.remarks ?? 'Request rejected';
        if (input.status === 'cancelled') {
            const isOwner = gatepass.user_id === actorUserId;
            const canCancel = isOwner || actorRole === 'admin';
            if (!canCancel) {
                throw new Error('You are not allowed to cancel this gatepass');
            }
            if (gatepass.status === 'active' || gatepass.status === 'completed') {
                throw new Error('This gatepass can no longer be cancelled');
            }
            await client.query(`UPDATE gatepasses
         SET status = 'cancelled',
             updated_at = NOW()
         WHERE id = $1`, [id]);
            await cancelPendingApprovalRequests(client, id, input.remarks ?? 'Request cancelled');
        }
        else if (actorRole === 'manager' && (input.status === 'approved' || input.status === 'rejected')) {
            const approvalRequest = await getPendingApprovalForActor(client, id, actorUserId, 'manager');
            if (gatepass.status !== 'pending_manager_approval' || approvalRequest.status !== 'pending') {
                throw new Error('This gatepass is not awaiting manager approval');
            }
            if (input.status === 'approved') {
                await client.query(`UPDATE gatepass_approval_requests
           SET status = 'approved',
               remarks = $2,
               acted_at = $3,
               updated_at = NOW()
           WHERE id = $1`, [approvalRequest.id, input.remarks ?? 'Approved by manager', nowIso]);
                await client.query(`UPDATE gatepasses
           SET status = $2,
               updated_at = NOW()
           WHERE id = $1`, [
                    id,
                    (await getApprovalRequestByStep(client, id, 2)).status === 'approved'
                        ? 'approved'
                        : 'pending_admin_approval',
                ]);
            }
            else {
                await client.query(`UPDATE gatepass_approval_requests
           SET status = 'rejected',
               remarks = $2,
               acted_at = $3,
               updated_at = NOW()
           WHERE id = $1`, [approvalRequest.id, rejectReason, nowIso]);
                await client.query(`UPDATE gatepasses
           SET status = 'rejected',
               rejection_reason = $2,
               updated_at = NOW()
           WHERE id = $1`, [id, rejectReason]);
                await cancelPendingApprovalRequests(client, id, 'Cancelled after manager rejection');
            }
        }
        else if (actorRole === 'admin' && (input.status === 'approved' || input.status === 'rejected')) {
            const requestedStep = input.approval_step ?? 2;
            if (requestedStep === 1) {
                if (gatepass.approval_flow !== 'manager_then_admin') {
                    throw new Error('Manager approval step is only available for Out requests');
                }
                if (gatepass.status !== 'pending_manager_approval') {
                    throw new Error('This gatepass is not awaiting manager approval');
                }
                const managerApprovalRequest = await getApprovalRequestByStep(client, id, 1);
                if (managerApprovalRequest.status !== 'pending') {
                    throw new Error('The manager approval step has already been processed');
                }
                if (input.status === 'approved') {
                    await client.query(`UPDATE gatepass_approval_requests
             SET status = 'approved',
                 remarks = $2,
                 acted_at = $3,
                 updated_at = NOW()
             WHERE id = $1`, [managerApprovalRequest.id, input.remarks ?? 'Approved by admin for manager step', nowIso]);
                    await client.query(`UPDATE gatepasses
             SET status = $2,
                 updated_at = NOW()
             WHERE id = $1`, [
                        id,
                        (await getApprovalRequestByStep(client, id, 2)).status === 'approved'
                            ? 'approved'
                            : 'pending_admin_approval',
                    ]);
                }
                else {
                    await client.query(`UPDATE gatepass_approval_requests
             SET status = 'rejected',
                 remarks = $2,
                 acted_at = $3,
                 updated_at = NOW()
             WHERE id = $1`, [managerApprovalRequest.id, rejectReason, nowIso]);
                    await client.query(`UPDATE gatepasses
             SET status = 'rejected',
                 rejection_reason = $2,
                 updated_at = NOW()
             WHERE id = $1`, [id, rejectReason]);
                    await cancelPendingApprovalRequests(client, id, 'Cancelled after admin rejected the manager step');
                }
            }
            else {
                const approvalRequest = await getPendingApprovalForActor(client, id, actorUserId, 'admin');
                if (!['pending_admin_approval', 'pending_manager_approval'].includes(gatepass.status)
                    || approvalRequest.status !== 'pending') {
                    throw new Error('This gatepass is not awaiting admin approval');
                }
                if (input.status === 'approved') {
                    await client.query(`UPDATE gatepass_approval_requests
             SET status = 'approved',
                 remarks = $2,
                 acted_at = $3,
                 updated_at = NOW()
             WHERE id = $1`, [approvalRequest.id, input.remarks ?? 'Approved by admin', nowIso]);
                    const managerApprovalPending = gatepass.approval_flow === 'manager_then_admin'
                        && (await getApprovalRequestByStep(client, id, 1)).status === 'pending';
                    await client.query(`UPDATE gatepasses
             SET status = $2,
                 updated_at = NOW()
             WHERE id = $1`, [id, managerApprovalPending ? 'pending_manager_approval' : 'approved']);
                }
                else {
                    await client.query(`UPDATE gatepass_approval_requests
             SET status = 'rejected',
                 remarks = $2,
                 acted_at = $3,
                 updated_at = NOW()
             WHERE id = $1`, [approvalRequest.id, rejectReason, nowIso]);
                    await client.query(`UPDATE gatepasses
             SET status = 'rejected',
                 rejection_reason = $2,
                 updated_at = NOW()
             WHERE id = $1`, [id, rejectReason]);
                    await cancelPendingApprovalRequests(client, id, 'Cancelled after admin rejection');
                }
            }
        }
        else if (actorRole === 'gatekeeper' && input.status === 'active') {
            if (gatepass.status !== 'approved') {
                throw new Error('Only approved gatepasses can be marked Out');
            }
            await client.query(`UPDATE gatepasses
         SET status = 'active',
             checked_out_at = $2,
             checked_out_by = $3,
             updated_at = NOW()
         WHERE id = $1`, [id, nowIso, actorUserId]);
        }
        else if (actorRole === 'gatekeeper' && input.status === 'completed') {
            if (gatepass.status !== 'active' || !gatepass.checked_out_at) {
                throw new Error('Only active gatepasses can be marked In');
            }
            const checkedOutAt = new Date(gatepass.checked_out_at);
            const checkedInAt = new Date(nowIso);
            const totalMinutesOutside = calculateWorkingMinutesOutside(checkedOutAt, checkedInAt);
            await client.query(`UPDATE gatepasses
         SET status = 'completed',
             checked_in_at = $2,
             checked_in_by = $3,
             total_minutes_outside = $4,
             updated_at = NOW()
         WHERE id = $1`, [id, nowIso, actorUserId, totalMinutesOutside]);
        }
        else {
            throw new Error('This status update is not allowed for your role');
        }
        await client.query('COMMIT');
        const updatedGatepass = await getGatepassByIdInternal((0, database_1.getDb)(), id);
        switch (updatedGatepass.status) {
            case 'approved':
                emitRealtimeUpdate(updatedGatepass, 'gatepass:approved');
                break;
            case 'rejected':
                emitRealtimeUpdate(updatedGatepass, 'gatepass:rejected');
                break;
            case 'active':
                emitRealtimeUpdate(updatedGatepass, 'gatepass:out');
                break;
            case 'completed':
                emitRealtimeUpdate(updatedGatepass, 'gatepass:in');
                break;
            case 'pending_admin_approval':
                emitRealtimeUpdate(updatedGatepass, 'gatepass:new-request');
                break;
            default:
                emitRealtimeUpdate(updatedGatepass);
                break;
        }
        return updatedGatepass;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
exports.updateGatepassStatus = updateGatepassStatus;
const deleteGatepass = async (id, actorUserId, actorRole) => {
    const gatepass = await getGatepassByIdInternal((0, database_1.getDb)(), id);
    if (actorRole !== 'admin' && gatepass.user_id !== actorUserId) {
        throw new Error('You are not allowed to delete this gatepass');
    }
    await (0, database_1.getDb)().query('DELETE FROM gatepasses WHERE id = $1', [id]);
};
exports.deleteGatepass = deleteGatepass;
//# sourceMappingURL=gatepass.service.js.map