"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertUserPresentForGatepass = exports.getUserAttendance = exports.resolveReportingDayStatus = exports.loadCompanyHolidayDates = exports.isWeeklyOffDate = exports.maxDateKey = exports.getUserEmploymentStartDate = exports.ensureUserExists = exports.resolveDate = exports.normalizeDateKey = exports.todayDate = exports.isValidDate = void 0;
const database_1 = require("../../../../config/database");
const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
exports.isValidDate = isValidDate;
const todayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
exports.todayDate = todayDate;
/** Normalize YYYY-MM-DD, Date, or ISO-like values to YYYY-MM-DD. */
const normalizeDateKey = (value) => {
    if (value == null || value === '')
        return undefined;
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime()))
            return undefined;
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    const raw = String(value).trim();
    if ((0, exports.isValidDate)(raw))
        return raw;
    const prefix = raw.slice(0, 10);
    if ((0, exports.isValidDate)(prefix))
        return prefix;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime()))
        return undefined;
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
exports.normalizeDateKey = normalizeDateKey;
const resolveDate = (date) => {
    if (date == null || date === '')
        return (0, exports.todayDate)();
    const normalized = (0, exports.normalizeDateKey)(date);
    if (!normalized)
        throw new Error('Invalid date. Use YYYY-MM-DD');
    return normalized;
};
exports.resolveDate = resolveDate;
const ensureUserExists = async (userId) => {
    const existing = await (0, database_1.getDb)().query('SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]);
    if (!existing.rows[0])
        throw new Error('User not found');
};
exports.ensureUserExists = ensureUserExists;
/** First day the user exists in the system (account create date as YYYY-MM-DD). */
const getUserEmploymentStartDate = async (userId) => {
    const existing = await (0, database_1.getDb)().query('SELECT created_at FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]);
    if (!existing.rows[0])
        throw new Error('User not found');
    const start = (0, exports.normalizeDateKey)(existing.rows[0].created_at);
    if (!start)
        throw new Error('User created_at is invalid');
    return start;
};
exports.getUserEmploymentStartDate = getUserEmploymentStartDate;
/** Later of two YYYY-MM-DD keys. */
const maxDateKey = (a, b) => (a > b ? a : b);
exports.maxDateKey = maxDateKey;
/**
 * Company weekly off policy:
 * - Every Sunday
 * - 1st Saturday of the month
 * - 3rd Saturday of the month
 */
const isWeeklyOffDate = (dateKey) => {
    const normalized = (0, exports.normalizeDateKey)(dateKey);
    if (!normalized)
        return false;
    const [year, month, day] = normalized.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const weekday = date.getDay(); // 0 = Sunday, 6 = Saturday
    if (weekday === 0)
        return true;
    if (weekday !== 6)
        return false;
    // Saturday: count which Saturday of the month (1st, 2nd, 3rd, …)
    const saturdayOrdinal = Math.floor((day - 1) / 7) + 1;
    return saturdayOrdinal === 1 || saturdayOrdinal === 3;
};
exports.isWeeklyOffDate = isWeeklyOffDate;
const loadCompanyHolidayDates = async (db, fromDate, toDate) => {
    const result = await db.query(`SELECT holiday_date
     FROM company_holidays
     WHERE is_active = TRUE
       AND deleted_at IS NULL
       AND is_paid = TRUE
       AND holiday_date BETWEEN $1::date AND $2::date`, [fromDate, toDate]);
    const dates = new Set();
    for (const row of result.rows) {
        const key = (0, exports.normalizeDateKey)(row.holiday_date);
        if (key)
            dates.add(key);
    }
    return dates;
};
exports.loadCompanyHolidayDates = loadCompanyHolidayDates;
/** Final day status: holiday / weekly off / absent / present / pending.
 * Present requires both in and out. In-only stays pending for admin review.
 */
const resolveReportingDayStatus = (inTime, outTime, reportDate, today = (0, exports.todayDate)(), holidayDates) => {
    const date = (0, exports.normalizeDateKey)(reportDate) ?? today;
    const todayKey = (0, exports.normalizeDateKey)(today) ?? today;
    const isPastDay = date < todayKey;
    if (!inTime) {
        if (holidayDates?.has(date))
            return 'holiday';
        if ((0, exports.isWeeklyOffDate)(date))
            return 'weekly_off';
        return isPastDay ? 'absent' : 'pending';
    }
    if (!outTime) {
        return 'pending';
    }
    return 'present';
};
exports.resolveReportingDayStatus = resolveReportingDayStatus;
const getUserAttendance = async (db, userId, date) => {
    const targetDate = (0, exports.resolveDate)(date);
    const today = (0, exports.todayDate)();
    // When reading "today", close any forgotten Punch Out from earlier days
    // so the new day always starts ready for Punch In.
    if (targetDate === today) {
        await db.query(`
      UPDATE user_in_out_time
      SET
        out_time = (date::timestamp + INTERVAL '1 day' - INTERVAL '1 second'),
        updated_at = NOW()
      WHERE user_id = $1
        AND date < $2::date
        AND deleted_at IS NULL
        AND in_time IS NOT NULL
        AND out_time IS NULL
      `, [userId, today]);
    }
    const result = await db.query(`SELECT in_time, out_time
     FROM user_in_out_time
     WHERE user_id = $1 AND date = $2 AND deleted_at IS NULL`, [userId, targetDate]);
    const row = result.rows[0];
    if (!row?.in_time) {
        return { date: targetDate, state: 'absent' };
    }
    if (row.out_time) {
        return {
            date: targetDate,
            state: 'left',
            in_time: row.in_time,
            out_time: row.out_time,
        };
    }
    return { date: targetDate, state: 'present', in_time: row.in_time };
};
exports.getUserAttendance = getUserAttendance;
const assertUserPresentForGatepass = async (db, userId, date) => {
    const attendance = await (0, exports.getUserAttendance)(db, userId, date);
    if (attendance.state === 'absent') {
        throw new Error('You are not in today. Ask the gatekeeper to mark you Present before you can request lunch, out, or other gatepasses.');
    }
    if (attendance.state === 'left') {
        throw new Error('Employee has already checked out for the day. Gatepass actions are not allowed.');
    }
};
exports.assertUserPresentForGatepass = assertUserPresentForGatepass;
//# sourceMappingURL=user-in-out-time.shared.js.map