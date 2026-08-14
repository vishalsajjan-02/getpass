import { getDb } from '../../../../config/database';
import type { AttendanceState, UserAttendance } from '../../../../types';
import type { PoolClient } from 'pg';

type Queryable = ReturnType<typeof getDb> | PoolClient;

export type { AttendanceState, UserAttendance };

export const isValidDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Standard paid shift length (hours). Time beyond this counts as OT. */
export const STANDARD_WORK_HOURS = 9.5;

/** Total hours between punch in/out, and OT after STANDARD_WORK_HOURS. */
export const calcWorkingHours = (
  inTime?: string | Date | null,
  outTime?: string | Date | null,
): { total_working_hr: number; ot: number } => {
  if (!inTime || !outTime) return { total_working_hr: 0, ot: 0 };
  const inMs = new Date(inTime).getTime();
  const outMs = new Date(outTime).getTime();
  if (!Number.isFinite(inMs) || !Number.isFinite(outMs) || outMs < inMs) {
    return { total_working_hr: 0, ot: 0 };
  }
  const total = Math.round(((outMs - inMs) / 3_600_000) * 100) / 100;
  const ot = Math.round(Math.max(0, total - STANDARD_WORK_HOURS) * 100) / 100;
  return { total_working_hr: total, ot };
};

/**
 * SQL snippet: set total_working_hr + ot from in_time and a given out expression.
 * `outExpr` examples: `NOW()`, `(date::timestamp + INTERVAL '1 day' - INTERVAL '1 second')`
 */
export const workingHoursSqlSet = (outExpr: string): string => `
  total_working_hr = ROUND(
    (EXTRACT(EPOCH FROM (${outExpr} - in_time)) / 3600.0)::numeric,
    2
  ),
  ot = GREATEST(
    0,
    ROUND((EXTRACT(EPOCH FROM (${outExpr} - in_time)) / 3600.0)::numeric, 2) - ${STANDARD_WORK_HOURS}
  )
`;

export const todayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Normalize YYYY-MM-DD, Date, or ISO-like values to YYYY-MM-DD. */
export const normalizeDateKey = (value?: string | Date | null): string | undefined => {
  if (value == null || value === '') return undefined;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const raw = String(value).trim();
  if (isValidDate(raw)) return raw;

  const prefix = raw.slice(0, 10);
  if (isValidDate(prefix)) return prefix;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Serialize DB timestamps for JSON clients (stable ISO string). */
export const toIsoTimestamp = (value?: string | Date | null): string | undefined => {
  if (value == null || value === '') return undefined;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return value.toISOString();
  }
  const raw = String(value).trim();
  if (!raw) return undefined;
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) return fallback.toISOString();
  return raw;
};

export const resolveDate = (date?: string | Date): string => {
  if (date == null || date === '') return todayDate();
  const normalized = normalizeDateKey(date);
  if (!normalized) throw new Error('Invalid date. Use YYYY-MM-DD');
  return normalized;
};

export const ensureUserExists = async (userId: string): Promise<void> => {
  const existing = await getDb().query(
    'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId],
  );
  if (!existing.rows[0]) throw new Error('User not found');
};

/** First day the user exists in the system (account create date as YYYY-MM-DD). */
export const getUserEmploymentStartDate = async (userId: string): Promise<string> => {
  const existing = await getDb().query(
    'SELECT created_at FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId],
  );
  if (!existing.rows[0]) throw new Error('User not found');
  const start = normalizeDateKey(existing.rows[0].created_at as string | Date);
  if (!start) throw new Error('User created_at is invalid');
  return start;
};

/** Later of two YYYY-MM-DD keys. */
export const maxDateKey = (a: string, b: string): string => (a > b ? a : b);

export type ReportingDayStatus = 'absent' | 'present' | 'pending' | 'weekly_off' | 'holiday';

/**
 * Company weekly off policy:
 * - Every Sunday
 * - 1st Saturday of the month
 * - 3rd Saturday of the month
 */
export const isWeeklyOffDate = (dateKey: string): boolean => {
  const normalized = normalizeDateKey(dateKey);
  if (!normalized) return false;

  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.getDay(); // 0 = Sunday, 6 = Saturday

  if (weekday === 0) return true;
  if (weekday !== 6) return false;

  // Saturday: count which Saturday of the month (1st, 2nd, 3rd, …)
  const saturdayOrdinal = Math.floor((day - 1) / 7) + 1;
  return saturdayOrdinal === 1 || saturdayOrdinal === 3;
};

export const loadCompanyHolidayDates = async (
  db: Queryable,
  fromDate: string,
  toDate: string,
): Promise<Set<string>> => {
  const result = await db.query(
    `SELECT holiday_date
     FROM company_holidays
     WHERE is_active = TRUE
       AND deleted_at IS NULL
       AND is_paid = TRUE
       AND holiday_date BETWEEN $1::date AND $2::date`,
    [fromDate, toDate],
  );

  const dates = new Set<string>();
  for (const row of result.rows) {
    const key = normalizeDateKey(row.holiday_date as string | Date);
    if (key) dates.add(key);
  }
  return dates;
};

/** Final day status: holiday / weekly off / absent / present / pending.
 * Present requires both in and out. In-only stays pending for admin review.
 */
export const resolveReportingDayStatus = (
  inTime?: string | null,
  outTime?: string | null,
  reportDate?: string,
  today: string = todayDate(),
  holidayDates?: Set<string>,
): ReportingDayStatus => {
  const date = normalizeDateKey(reportDate) ?? today;
  const todayKey = normalizeDateKey(today) ?? today;
  const isPastDay = date < todayKey;

  if (!inTime) {
    if (holidayDates?.has(date)) return 'holiday';
    if (isWeeklyOffDate(date)) return 'weekly_off';
    return isPastDay ? 'absent' : 'pending';
  }
  if (!outTime) {
    return 'pending';
  }
  return 'present';
};

export const getUserAttendance = async (
  db: Queryable,
  userId: string,
  date?: string | Date,
): Promise<UserAttendance> => {
  const targetDate = resolveDate(date);
  const today = todayDate();

  // When reading "today", close any forgotten Punch Out from earlier days
  // so the new day always starts ready for Punch In.
  if (targetDate === today) {
    await db.query(
      `
      UPDATE user_in_out_time
      SET
        out_time = (date::timestamp + INTERVAL '1 day' - INTERVAL '1 second'),
        ${workingHoursSqlSet(`(date::timestamp + INTERVAL '1 day' - INTERVAL '1 second')`)},
        updated_at = NOW()
      WHERE user_id = $1
        AND date < $2::date
        AND deleted_at IS NULL
        AND in_time IS NOT NULL
        AND out_time IS NULL
      `,
      [userId, today],
    );
  }

  const result = await db.query(
    `SELECT in_time, out_time
     FROM user_in_out_time
     WHERE user_id = $1 AND date = $2 AND deleted_at IS NULL`,
    [userId, targetDate],
  );
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

export const assertUserPresentForGatepass = async (
  db: Queryable,
  userId: string,
  date?: string | Date,
): Promise<void> => {
  const attendance = await getUserAttendance(db, userId, date);
  if (attendance.state === 'absent') {
    throw new Error(
      'You are not in today. Ask the gatekeeper to mark you Present before you can request lunch, out, or other gatepasses.',
    );
  }
  if (attendance.state === 'left') {
    throw new Error('Employee has already checked out for the day. Gatepass actions are not allowed.');
  }
};
