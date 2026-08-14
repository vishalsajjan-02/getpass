"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserMonthAttendance = exports.getUserHistory = void 0;
const database_1 = require("../../../config/database");
const uploads_1 = require("../../../utils/uploads");
const user_in_out_time_shared_1 = require("./shared/user-in-out-time.shared");
const leave_balance_shared_1 = require("../../leave/service/shared/leave-balance.shared");
const monthBounds = (month) => {
    if (!/^\d{4}-\d{2}$/.test(month)) {
        throw new Error('Invalid month. Use YYYY-MM');
    }
    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr);
    if (monthIndex < 1 || monthIndex > 12) {
        throw new Error('Invalid month. Use YYYY-MM');
    }
    const lastDay = new Date(year, monthIndex, 0).getDate();
    return {
        from: `${yearStr}-${monthStr}-01`,
        to: `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
    };
};
const listDatesInclusive = (fromDate, toDate) => {
    const dates = [];
    const cursor = new Date(`${fromDate}T12:00:00`);
    const end = new Date(`${toDate}T12:00:00`);
    while (cursor <= end) {
        const year = cursor.getFullYear();
        const month = String(cursor.getMonth() + 1).padStart(2, '0');
        const day = String(cursor.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
};
const mapHistoryRow = (row) => ({
    id: String(row.id),
    user_id: String(row.user_id),
    date: (0, user_in_out_time_shared_1.normalizeDateKey)(row.date) ?? String(row.date).slice(0, 10),
    in_time: row.in_time ? String(row.in_time) : undefined,
    out_time: row.out_time ? String(row.out_time) : undefined,
    in_location: row.in_location ? String(row.in_location) : undefined,
    out_location: row.out_location ? String(row.out_location) : undefined,
    in_latitude: row.in_latitude != null ? Number(row.in_latitude) : undefined,
    in_longitude: row.in_longitude != null ? Number(row.in_longitude) : undefined,
    out_latitude: row.out_latitude != null ? Number(row.out_latitude) : undefined,
    out_longitude: row.out_longitude != null ? Number(row.out_longitude) : undefined,
    in_via: row.in_via === 'self' || row.in_via === 'gatekeeper' ? row.in_via : undefined,
    out_via: row.out_via === 'self' || row.out_via === 'gatekeeper' ? row.out_via : undefined,
    in_photo_path: row.in_photo_path ? String(row.in_photo_path) : undefined,
    out_photo_path: row.out_photo_path ? String(row.out_photo_path) : undefined,
    in_photo_url: (0, uploads_1.publicUploadUrl)(row.in_photo_path ? String(row.in_photo_path) : null),
    out_photo_url: (0, uploads_1.publicUploadUrl)(row.out_photo_path ? String(row.out_photo_path) : null),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
});
const getUserHistory = async (userId, fromDate, toDate) => {
    await (0, user_in_out_time_shared_1.ensureUserExists)(userId);
    const employmentStart = await (0, user_in_out_time_shared_1.getUserEmploymentStartDate)(userId);
    const conditions = ['user_id = $1', 'deleted_at IS NULL'];
    const params = [userId];
    // Never include attendance before the user was created.
    const clampedFrom = fromDate
        ? (() => {
            if (!(0, user_in_out_time_shared_1.isValidDate)(fromDate))
                throw new Error('Invalid fromDate. Use YYYY-MM-DD');
            return (0, user_in_out_time_shared_1.maxDateKey)(fromDate, employmentStart);
        })()
        : employmentStart;
    params.push(clampedFrom);
    conditions.push(`date >= $${params.length}::date`);
    if (toDate) {
        if (!(0, user_in_out_time_shared_1.isValidDate)(toDate))
            throw new Error('Invalid toDate. Use YYYY-MM-DD');
        params.push(toDate);
        conditions.push(`date <= $${params.length}::date`);
    }
    const result = await (0, database_1.getDb)().query(`
    SELECT
      id, user_id, date, in_time, out_time,
      in_location, out_location,
      in_latitude, in_longitude, out_latitude, out_longitude,
      in_via, out_via, in_photo_path, out_photo_path,
      created_at, updated_at
    FROM user_in_out_time
    WHERE ${conditions.join(' AND ')}
    ORDER BY date DESC
    `, params);
    return result.rows.map((row) => mapHistoryRow(row));
};
exports.getUserHistory = getUserHistory;
/** Full calendar for a month: every date with in/out times and day status. */
const getUserMonthAttendance = async (userId, month) => {
    await (0, user_in_out_time_shared_1.ensureUserExists)(userId);
    const employmentStart = await (0, user_in_out_time_shared_1.getUserEmploymentStartDate)(userId);
    const leaveBalance = await (0, leave_balance_shared_1.ensureLeaveAccrual)(userId);
    const { leave_used, used_leaves } = await (0, leave_balance_shared_1.getUserUsedLeaves)(userId);
    const { from, to } = monthBounds(month);
    const today = (0, user_in_out_time_shared_1.todayDate)();
    const effectiveFrom = (0, user_in_out_time_shared_1.maxDateKey)(from, employmentStart);
    const effectiveTo = to > today ? today : to;
    if (effectiveFrom > effectiveTo) {
        return { days: [], leave_balance: leaveBalance, leave_used, used_leaves };
    }
    const history = await (0, exports.getUserHistory)(userId, effectiveFrom, effectiveTo);
    const holidayDates = await (0, user_in_out_time_shared_1.loadCompanyHolidayDates)((0, database_1.getDb)(), effectiveFrom, effectiveTo);
    const leaveResult = await (0, database_1.getDb)().query(`SELECT udl.date, udl.leave_type_id, lt.name
     FROM user_day_leaves udl
     JOIN leave_types lt ON lt.id = udl.leave_type_id
     WHERE udl.user_id = $1
       AND udl.deleted_at IS NULL
       AND lt.deleted_at IS NULL
       AND udl.date BETWEEN $2::date AND $3::date`, [userId, effectiveFrom, effectiveTo]);
    const leaveByDate = new Map();
    for (const row of leaveResult.rows) {
        const dateKey = (0, user_in_out_time_shared_1.normalizeDateKey)(row.date);
        if (!dateKey)
            continue;
        leaveByDate.set(dateKey, {
            leave_type_id: String(row.leave_type_id),
            leave_type_name: String(row.name),
        });
    }
    const byDate = new Map(history.map((row) => [
        row.date,
        {
            in_time: row.in_time,
            out_time: row.out_time,
            in_location: row.in_location,
            out_location: row.out_location,
            in_latitude: row.in_latitude,
            in_longitude: row.in_longitude,
            out_latitude: row.out_latitude,
            out_longitude: row.out_longitude,
            in_via: row.in_via,
            out_via: row.out_via,
            in_photo_path: row.in_photo_path,
            out_photo_path: row.out_photo_path,
            in_photo_url: row.in_photo_url,
            out_photo_url: row.out_photo_url,
        },
    ]));
    const gatepassResult = await (0, database_1.getDb)().query(`SELECT
       g.id,
       g.date,
       g.status,
       g.gatepass_type,
       g.reason_description,
       g.checked_out_at,
       g.checked_in_at,
       g.total_minutes_outside,
       gr.name AS reason_name
     FROM gatepasses g
     JOIN gatepass_reasons gr ON gr.id = g.reason_id AND gr.deleted_at IS NULL
     WHERE g.user_id = $1
       AND g.deleted_at IS NULL
       AND g.status <> 'cancelled'
       AND g.date BETWEEN $2::date AND $3::date
     ORDER BY g.created_at ASC`, [userId, effectiveFrom, effectiveTo]);
    const gatepassesByDate = new Map();
    for (const row of gatepassResult.rows) {
        const dateKey = (0, user_in_out_time_shared_1.normalizeDateKey)(row.date);
        if (!dateKey)
            continue;
        const reasonName = String(row.reason_name);
        const reasonDescription = row.reason_description != null && String(row.reason_description).trim() !== ''
            ? String(row.reason_description).trim()
            : undefined;
        const summary = {
            id: String(row.id),
            reason_name: reasonName,
            display_reason: reasonDescription ? `${reasonName}: ${reasonDescription}` : reasonName,
            status: String(row.status),
            gatepass_type: String(row.gatepass_type ?? 'out-in'),
            checked_out_at: row.checked_out_at ? String(row.checked_out_at) : undefined,
            checked_in_at: row.checked_in_at ? String(row.checked_in_at) : undefined,
            total_minutes_outside: Number(row.total_minutes_outside ?? 0),
        };
        const list = gatepassesByDate.get(dateKey) ?? [];
        list.push(summary);
        gatepassesByDate.set(dateKey, list);
    }
    const days = listDatesInclusive(effectiveFrom, effectiveTo).map((date) => {
        const entry = byDate.get(date);
        const leave = leaveByDate.get(date);
        const dayGatepasses = gatepassesByDate.get(date);
        const punchFields = {
            in_time: entry?.in_time,
            out_time: entry?.out_time,
            in_location: entry?.in_location,
            out_location: entry?.out_location,
            in_latitude: entry?.in_latitude,
            in_longitude: entry?.in_longitude,
            out_latitude: entry?.out_latitude,
            out_longitude: entry?.out_longitude,
            in_via: entry?.in_via,
            out_via: entry?.out_via,
            in_photo_path: entry?.in_photo_path,
            out_photo_path: entry?.out_photo_path,
            in_photo_url: entry?.in_photo_url,
            out_photo_url: entry?.out_photo_url,
        };
        if (leave) {
            const leaveName = leave.leave_type_name.trim().toLowerCase();
            const isWorkFromHome = leaveName === 'work from home';
            // Half-Day Leave stays marked as leave; UI counts it as 0.5 present + 0.5 absent.
            return {
                date,
                ...punchFields,
                // WFH is attendance present, not leave.
                day_status: isWorkFromHome ? 'present' : 'leave',
                leave_type_id: leave.leave_type_id,
                leave_type_name: leave.leave_type_name,
                gatepasses: dayGatepasses,
            };
        }
        return {
            date,
            ...punchFields,
            day_status: (0, user_in_out_time_shared_1.resolveReportingDayStatus)(entry?.in_time, entry?.out_time, date, today, holidayDates),
            gatepasses: dayGatepasses,
        };
    });
    return { days, leave_balance: leaveBalance, leave_used, used_leaves };
};
exports.getUserMonthAttendance = getUserMonthAttendance;
//# sourceMappingURL=get-user-history.service.js.map