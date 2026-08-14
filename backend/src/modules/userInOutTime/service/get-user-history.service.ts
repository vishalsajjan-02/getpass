import { getDb } from '../../../config/database';
import type { UserInOutTime } from '../../../types';
import { publicUploadUrl } from '../../../utils/uploads';
import {
  ensureUserExists,
  getUserEmploymentStartDate,
  isValidDate,
  loadCompanyHolidayDates,
  maxDateKey,
  normalizeDateKey,
  resolveReportingDayStatus,
  toIsoTimestamp,
  todayDate,
} from './shared/user-in-out-time.shared';
import { ensureLeaveAccrual, getUserUsedLeaves } from '../../leave/service/shared/leave-balance.shared';

export type UserDayGatepassSummary = {
  id: string;
  reason_name: string;
  display_reason: string;
  status: string;
  gatepass_type: string;
  checked_out_at?: string;
  checked_in_at?: string;
  total_minutes_outside: number;
};

export type UserDayAttendance = {
  date: string;
  in_time?: string;
  out_time?: string;
  total_working_hr?: number;
  ot?: number;
  in_location?: string;
  out_location?: string;
  in_latitude?: number;
  in_longitude?: number;
  out_latitude?: number;
  out_longitude?: number;
  in_via?: 'self' | 'gatekeeper';
  out_via?: 'self' | 'gatekeeper';
  in_photo_path?: string;
  out_photo_path?: string;
  in_photo_url?: string;
  out_photo_url?: string;
  day_status: 'absent' | 'present' | 'pending' | 'weekly_off' | 'holiday' | 'leave';
  leave_type_id?: string;
  leave_type_name?: string;
  /** Gatepasses for this date (useful when out_time is missing). */
  gatepasses?: UserDayGatepassSummary[];
};

export type UsedLeaveEntry = {
  date: string;
  leave_type_id: string;
  leave_type_name: string;
  days: number;
};

export type UserMonthAttendanceResult = {
  days: UserDayAttendance[];
  leave_balance: number;
  leave_used: number;
  used_leaves: UsedLeaveEntry[];
};

const monthBounds = (month: string): { from: string; to: string } => {
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

const listDatesInclusive = (fromDate: string, toDate: string): string[] => {
  const dates: string[] = [];
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

const mapHistoryRow = (row: Record<string, unknown>): UserInOutTime => ({
  id: String(row.id),
  user_id: String(row.user_id),
  date: normalizeDateKey(row.date as string | Date) ?? String(row.date).slice(0, 10),
  in_time: toIsoTimestamp(row.in_time as string | Date | null),
  out_time: toIsoTimestamp(row.out_time as string | Date | null),
  total_working_hr: row.total_working_hr != null ? Number(row.total_working_hr) : undefined,
  ot: row.ot != null ? Number(row.ot) : undefined,
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
  in_photo_url: publicUploadUrl(row.in_photo_path ? String(row.in_photo_path) : null),
  out_photo_url: publicUploadUrl(row.out_photo_path ? String(row.out_photo_path) : null),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

export const getUserHistory = async (
  userId: string,
  fromDate?: string,
  toDate?: string,
): Promise<UserInOutTime[]> => {
  await ensureUserExists(userId);
  const employmentStart = await getUserEmploymentStartDate(userId);

  const conditions: string[] = ['user_id = $1', 'deleted_at IS NULL'];
  const params: unknown[] = [userId];

  // Never include attendance before the user was created.
  const clampedFrom = fromDate
    ? (() => {
        if (!isValidDate(fromDate)) throw new Error('Invalid fromDate. Use YYYY-MM-DD');
        return maxDateKey(fromDate, employmentStart);
      })()
    : employmentStart;
  params.push(clampedFrom);
  conditions.push(`date >= $${params.length}::date`);

  if (toDate) {
    if (!isValidDate(toDate)) throw new Error('Invalid toDate. Use YYYY-MM-DD');
    params.push(toDate);
    conditions.push(`date <= $${params.length}::date`);
  }

  const result = await getDb().query(
    `
    SELECT
      id, user_id, date, in_time, out_time, total_working_hr, ot,
      in_location, out_location,
      in_latitude, in_longitude, out_latitude, out_longitude,
      in_via, out_via, in_photo_path, out_photo_path,
      created_at, updated_at
    FROM user_in_out_time
    WHERE ${conditions.join(' AND ')}
    ORDER BY date DESC
    `,
    params,
  );

  return result.rows.map((row) => mapHistoryRow(row));
};

/** Full calendar for a month: every date with in/out times and day status. */
export const getUserMonthAttendance = async (
  userId: string,
  month: string,
): Promise<UserMonthAttendanceResult> => {
  await ensureUserExists(userId);
  const employmentStart = await getUserEmploymentStartDate(userId);

  const leaveBalance = await ensureLeaveAccrual(userId);
  const { leave_used, used_leaves } = await getUserUsedLeaves(userId);

  const { from, to } = monthBounds(month);
  const today = todayDate();
  const effectiveFrom = maxDateKey(from, employmentStart);
  const effectiveTo = to > today ? today : to;

  if (effectiveFrom > effectiveTo) {
    return { days: [], leave_balance: leaveBalance, leave_used, used_leaves };
  }

  const history = await getUserHistory(userId, effectiveFrom, effectiveTo);
  const holidayDates = await loadCompanyHolidayDates(getDb(), effectiveFrom, effectiveTo);

  const leaveResult = await getDb().query(
    `SELECT udl.date, udl.leave_type_id, lt.name
     FROM user_day_leaves udl
     JOIN leave_types lt ON lt.id = udl.leave_type_id
     WHERE udl.user_id = $1
       AND udl.deleted_at IS NULL
       AND lt.deleted_at IS NULL
       AND udl.date BETWEEN $2::date AND $3::date`,
    [userId, effectiveFrom, effectiveTo],
  );
  const leaveByDate = new Map<
    string,
    { leave_type_id: string; leave_type_name: string }
  >();
  for (const row of leaveResult.rows) {
    const dateKey = normalizeDateKey(row.date as string | Date);
    if (!dateKey) continue;
    leaveByDate.set(dateKey, {
      leave_type_id: String(row.leave_type_id),
      leave_type_name: String(row.name),
    });
  }

  const byDate = new Map(
    history.map((row) => [
      row.date,
      {
        in_time: row.in_time,
        out_time: row.out_time,
        total_working_hr: row.total_working_hr,
        ot: row.ot,
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
    ]),
  );

  const gatepassResult = await getDb().query(
    `SELECT
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
     ORDER BY g.created_at ASC`,
    [userId, effectiveFrom, effectiveTo],
  );

  const gatepassesByDate = new Map<string, UserDayGatepassSummary[]>();
  for (const row of gatepassResult.rows) {
    const dateKey = normalizeDateKey(row.date as string | Date);
    if (!dateKey) continue;
    const reasonName = String(row.reason_name);
    const reasonDescription =
      row.reason_description != null && String(row.reason_description).trim() !== ''
        ? String(row.reason_description).trim()
        : undefined;
    const summary: UserDayGatepassSummary = {
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
      total_working_hr: entry?.total_working_hr,
      ot: entry?.ot,
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
        day_status: isWorkFromHome ? ('present' as const) : ('leave' as const),
        leave_type_id: leave.leave_type_id,
        leave_type_name: leave.leave_type_name,
        gatepasses: dayGatepasses,
      };
    }
    return {
      date,
      ...punchFields,
      day_status: resolveReportingDayStatus(entry?.in_time, entry?.out_time, date, today, holidayDates),
      gatepasses: dayGatepasses,
    };
  });

  return { days, leave_balance: leaveBalance, leave_used, used_leaves };
};
