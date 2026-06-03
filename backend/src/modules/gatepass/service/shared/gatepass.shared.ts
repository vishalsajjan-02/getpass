import { getDb } from '../../../../config/database';
import { env } from '../../../../config/env';
import { emitGatepassSocketEvent } from '../../../../realtime/socket';
import type {
  ApprovalFlow,
  CreateGatepassInput,
  DailyLunchReport,
  EmployeeLiveStatus,
  Gatepass,
  GatepassApprovalRequest,
  GatepassReason,
  GatepassStats,
  GatepassStatus,
  GatepassType,
  GatepassWithProfile,
  LiveEmployeeStatusReport,
  LunchActivityLog,
  LunchAnalyticsRangeReport,
  LunchEmployeeDetailReport,
  LunchEmployeeSummary,
  LunchEntryReport,
  MonthlyLunchReport,
  UpdateGatepassStatusInput,
  UserRole,
  YearlyLunchMonthSummary,
  YearlyLunchReport,
} from '../../../../types';

const WORKDAY_START_HOUR = 9;
const WORKDAY_END_HOUR = 18;
export const LUNCH_REASON_NAME = 'lunch';
export const LUNCH_LIMIT_MINUTES = env.TIME_FOR_LUNCH_MINUTES;

type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

type RequesterContext = {
  id: string;
  role: UserRole;
  manager_id?: string;
};

type LunchEntryRow = {
  user_id: string;
  employee_name: string;
  department?: string;
  id: string;
  date: string;
  reason_name: string;
  status: GatepassStatus;
  checked_out_at?: string;
  checked_in_at?: string;
  total_minutes_outside: number;
};

export const optionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export const isPermanentOutGatepass = (gatepass: Pick<Gatepass, 'gatepass_type' | 'reason_name'>): boolean =>
  gatepass.gatepass_type === 'out' || gatepass.reason_name.trim().toLowerCase() === 'out';

const toApprovalRequests = (value: unknown): GatepassApprovalRequest[] => {
  if (Array.isArray(value)) return value as GatepassApprovalRequest[];
  return [];
};

const rowToGatepass = (row: Record<string, unknown>): Gatepass => ({
  id: String(row.id),
  user_id: String(row.user_id),
  reason_id: String(row.reason_id),
  reason_name: String(row.reason_name),
  display_reason: String(row.display_reason),
  reason_description: optionalString(row.reason_description),
  destination: optionalString(row.destination),
  date: String(row.date),
  status: row.status as GatepassStatus,
  approval_flow: row.approval_flow as ApprovalFlow,
  gatepass_type: (row.gatepass_type as GatepassType) ?? 'out-in',
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

const withProfile = (row: Record<string, unknown>): GatepassWithProfile => ({
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
    g.gatepass_type,
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

export const buildVisibilityClause = (
  role: UserRole,
  userId: string,
  startingParamIndex: number,
): { clause?: string; params: unknown[] } => {
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

const buildQuery = (conditions: string[]): string => {
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  return `${BASE_QUERY}${where}${GROUP_BY} ORDER BY g.created_at DESC`;
};

export const runGatepassQuery = async (
  db: Queryable,
  conditions: string[],
  params: unknown[],
): Promise<GatepassWithProfile[]> => {
  const result = await db.query(buildQuery(conditions), params);
  return result.rows.map(withProfile);
};

export const getGatepassByIdInternal = async (db: Queryable, id: string): Promise<GatepassWithProfile> => {
  const result = await db.query(`${BASE_QUERY} WHERE g.id = $1${GROUP_BY}`, [id]);
  const row = result.rows[0];
  if (!row) throw new Error('Gatepass not found');
  return withProfile(row);
};

export const getRequesterContext = async (db: Queryable, userId: string): Promise<RequesterContext> => {
  const result = await db.query(
    `SELECT u.id, r.name AS role, u.manager_id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Requester not found');
  return {
    id: String(row.id),
    role: row.role as UserRole,
    manager_id: optionalString(row.manager_id),
  };
};

export const getPrimaryAdminId = async (db: Queryable): Promise<string> => {
  const result = await db.query(
    `SELECT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'admin'
     ORDER BY u.created_at ASC
     LIMIT 1`,
  );
  const row = result.rows[0];
  if (!row) throw new Error('No admin user configured');
  return String(row.id);
};

export const resolveReason = async (db: Queryable, input: CreateGatepassInput): Promise<GatepassReason> => {
  if (input.reason_id) {
    const result = await db.query(
      `SELECT id, name
       FROM gatepass_reasons
       WHERE id = $1`,
      [input.reason_id],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Invalid gatepass reason');
    return row as unknown as GatepassReason;
  }

  const reasonName = optionalString(input.reason_name);
  if (!reasonName) {
    throw new Error('reason_id is required');
  }

  const result = await db.query(
    `SELECT id, name
     FROM gatepass_reasons
     WHERE LOWER(name) = LOWER($1)`,
    [reasonName],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Invalid gatepass reason');
  return row as unknown as GatepassReason;
};

export const getPendingApprovalForActor = async (
  db: Queryable,
  gatepassId: string,
  actorUserId: string,
  approverRole: 'admin' | 'manager',
): Promise<GatepassApprovalRequest> => {
  const result = await db.query(
    `SELECT id, gatepass_id, approver_user_id, approver_role, step, status,
            remarks, acted_at, created_at, updated_at
     FROM gatepass_approval_requests
     WHERE gatepass_id = $1
       AND approver_user_id = $2
       AND approver_role = $3
     LIMIT 1`,
    [gatepassId, actorUserId, approverRole],
  );
  const row = result.rows[0];
  if (!row) throw new Error(`No ${approverRole} approval request found for this gatepass`);
  return row as unknown as GatepassApprovalRequest;
};

export const getApprovalRequestByStep = async (
  db: Queryable,
  gatepassId: string,
  step: 1 | 2,
): Promise<GatepassApprovalRequest> => {
  const result = await db.query(
    `SELECT id, gatepass_id, approver_user_id, approver_role, step, status,
            remarks, acted_at, created_at, updated_at
     FROM gatepass_approval_requests
     WHERE gatepass_id = $1
       AND step = $2
     LIMIT 1`,
    [gatepassId, step],
  );
  const row = result.rows[0];
  if (!row) throw new Error(`No approval request found for step ${step}`);
  return row as unknown as GatepassApprovalRequest;
};

export const cancelPendingApprovalRequests = async (
  db: Queryable,
  gatepassId: string,
  remarks: string,
): Promise<void> => {
  await db.query(
    `UPDATE gatepass_approval_requests
     SET status = 'cancelled',
         remarks = COALESCE(remarks, $2),
         updated_at = NOW()
     WHERE gatepass_id = $1
       AND status = 'pending'`,
    [gatepassId, remarks],
  );
};

export const calculateWorkingMinutesOutside = (checkedOutAt: Date, checkedInAt: Date): number => {
  if (checkedInAt <= checkedOutAt) return 0;

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

export const emitRealtimeUpdate = (
  gatepass: GatepassWithProfile,
  eventName?: 'gatepass:new-request' | 'gatepass:approved' | 'gatepass:rejected' | 'gatepass:out' | 'gatepass:in',
): void => {
  if (eventName) {
    emitGatepassSocketEvent(eventName, gatepass);
  }
  emitGatepassSocketEvent('gatepass:status-updated', gatepass);
};

export const parseTimestamp = (value?: string): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const calculateMinutesBetween = (startValue?: string, endValue?: string, fallbackEnd?: Date): number => {
  const start = parseTimestamp(startValue);
  if (!start) return 0;

  const end = endValue ? parseTimestamp(endValue) : (fallbackEnd ?? null);
  if (!end) return 0;

  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
};

export const calculateExtraLunchMinutes = (durationMinutes: number): number =>
  Math.max(0, durationMinutes - LUNCH_LIMIT_MINUTES);

export const parseDateParam = (value: string | undefined, fallback: Date): string => {
  if (!value) return fallback.toISOString().slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback.toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
};

export const parseMonthParam = (value?: string): { monthLabel: string; startDate: string; endDate: string } => {
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

export const parseYearParam = (value?: string): { year: number; startDate: string; endDate: string } => {
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

export const normalizeDateRange = (
  startDateParam?: string,
  endDateParam?: string,
): { startDate: string; endDate: string } => {
  const now = new Date();
  const fallback = now.toISOString().slice(0, 10);
  const startDate = parseDateParam(startDateParam, now);
  const endDate = parseDateParam(endDateParam, now);

  return startDate <= endDate
    ? { startDate, endDate }
    : { startDate: endDate || fallback, endDate: startDate || fallback };
};

export const getLiveEmployeeStatusesInternal = async (
  db: Queryable,
  employeeId?: string,
): Promise<LiveEmployeeStatusReport[]> => {
  const params: unknown[] = [];
  const employeeFilter = employeeId ? ' AND u.id = $1' : '';

  if (employeeId) params.push(employeeId);

  const result = await db.query(
    `SELECT
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
         AND g.status = 'active'
         AND g.checked_out_at IS NOT NULL
         AND g.checked_in_at IS NULL
       ORDER BY g.checked_out_at DESC NULLS LAST, g.created_at DESC
       LIMIT 1
     ) active ON TRUE
     WHERE r.name IN ('employee', 'manager')
     ${employeeFilter}
     ORDER BY u.name`,
    params,
  );

  return result.rows.map((row) => {
    const activeReasonName = optionalString(row.active_reason_name);
    const checkedOutAt = optionalString(row.checked_out_at);
    const checkedInAt = optionalString(row.checked_in_at);
    const onLunch = activeReasonName?.toLowerCase() === LUNCH_REASON_NAME && !!checkedOutAt && !checkedInAt;
    const currentStatus: EmployeeLiveStatus = onLunch
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
    } satisfies LiveEmployeeStatusReport;
  });
};

export const getLunchEntriesInRange = async (
  db: Queryable,
  startDate: string,
  endDate: string,
  employeeId?: string,
): Promise<LunchEntryRow[]> => {
  const params: unknown[] = [startDate, endDate];
  const employeeFilter = employeeId ? ' AND u.id = $3' : '';

  if (employeeId) params.push(employeeId);

  const result = await db.query(
    `SELECT
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
     ORDER BY u.name, g.date DESC, g.checked_out_at DESC NULLS LAST, g.created_at DESC`,
    params,
  );

  return result.rows.map((row) => ({
    user_id: String(row.user_id),
    employee_name: String(row.employee_name),
    department: optionalString(row.department),
    id: String(row.id),
    date: String(row.date),
    reason_name: String(row.reason_name),
    status: row.status as GatepassStatus,
    checked_out_at: optionalString(row.checked_out_at),
    checked_in_at: optionalString(row.checked_in_at),
    total_minutes_outside: Number(row.total_minutes_outside ?? 0),
  }));
};

export const getEmployeeActivityLogsInRange = async (
  db: Queryable,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<LunchActivityLog[]> => {
  const result = await db.query(
    `SELECT
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
     ORDER BY g.date DESC, g.checked_out_at DESC NULLS LAST, g.created_at DESC`,
    [userId, startDate, endDate],
  );

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
      status: row.status as GatepassStatus,
      checked_out_at: checkedOutAt,
      checked_in_at: checkedInAt,
      total_outside_office_minutes: Number(row.total_minutes_outside ?? 0),
      lunch_duration_minutes: lunchDurationMinutes,
      extra_lunch_minutes: extraLunchMinutes,
      violation: extraLunchMinutes > 0,
    } satisfies LunchActivityLog;
  });
};

export const buildLunchEmployeeSummaries = (
  liveStatuses: LiveEmployeeStatusReport[],
  entries: LunchEntryRow[],
): LunchEmployeeSummary[] => {
  const summaries = new Map<string, LunchEmployeeSummary>();

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
    const entryCurrentStatus: EmployeeLiveStatus =
      entry.checked_out_at && !entry.checked_in_at
        ? (isLunchEntry ? 'On Lunch' : 'Outside Office')
        : 'In Office';
    const lunchEntry: LunchEntryReport = {
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
      current_status: 'In Office' as EmployeeLiveStatus,
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

export const getTopLunchViolators = (employees: LunchEmployeeSummary[]): LunchEmployeeSummary[] =>
  [...employees]
    .filter((employee) => employee.total_extra_lunch_minutes > 0)
    .sort((left, right) => {
      if (right.total_extra_lunch_minutes !== left.total_extra_lunch_minutes) {
        return right.total_extra_lunch_minutes - left.total_extra_lunch_minutes;
      }
      return right.violation_count - left.violation_count;
    })
    .slice(0, 5);

export const filterEmployeesWithHistory = (employees: LunchEmployeeSummary[]): LunchEmployeeSummary[] =>
  employees.filter((employee) => employee.entries.length > 0);

export const buildLunchAnalyticsRangeReport = async (
  startDate: string,
  endDate: string,
  employeeId?: string,
): Promise<LunchAnalyticsRangeReport> => {
  const liveStatuses = await getLiveEmployeeStatusesInternal(getDb(), employeeId);
  const entries = await getLunchEntriesInRange(getDb(), startDate, endDate, employeeId);
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
