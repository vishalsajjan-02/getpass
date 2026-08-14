import { getDailyReport } from './get-daily-report.service';
import { getDb } from '../../../config/database';
import type { AttendanceReportRow } from '../../../types';
import {
  isValidDate,
  loadCompanyHolidayDates,
  maxDateKey,
  normalizeDateKey,
  resolveReportingDayStatus,
  toIsoTimestamp,
  todayDate,
} from './shared/user-in-out-time.shared';

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

export const resolveAttendanceRange = (params: {
  date?: string;
  month?: string;
  from?: string;
  to?: string;
}): { from: string; to: string } => {
  if (params.month) {
    return monthBounds(params.month);
  }
  if (params.date) {
    if (!isValidDate(params.date)) throw new Error('Invalid date. Use YYYY-MM-DD');
    return { from: params.date, to: params.date };
  }
  if (params.from && params.to) {
    if (!isValidDate(params.from) || !isValidDate(params.to)) {
      throw new Error('Invalid from/to. Use YYYY-MM-DD');
    }
    if (params.from > params.to) throw new Error('from must be on or before to');
    return { from: params.from, to: params.to };
  }
  const today = todayDate();
  return { from: today, to: today };
};

export const getAttendanceReport = async (
  params: { date?: string; month?: string; from?: string; to?: string },
): Promise<AttendanceReportRow[]> => {
  const { from, to } = resolveAttendanceRange(params);
  const today = todayDate();
  const effectiveTo = to > today ? today : to;

  if (from > effectiveTo) {
    return [];
  }

  if (from === to) {
    const daily = await getDailyReport(from);
    return daily.map((row) => ({
      user_id: row.user_id,
      user_name: row.user_name,
      email: row.email,
      role: row.role,
      department: row.department,
      date: row.date,
      in_time: row.in_time,
      out_time: row.out_time,
      in_via: row.in_via,
      out_via: row.out_via,
      day_status: row.day_status ?? resolveReportingDayStatus(row.in_time, row.out_time, row.date, today),
    }));
  }

  const usersResult = await getDb().query(
    `
    SELECT
      u.id AS user_id,
      u.name AS user_name,
      u.email,
      r.name AS role,
      d.name AS department,
      u.created_at
    FROM users u
    JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
    LEFT JOIN departments d ON d.id = u.department_id AND d.deleted_at IS NULL
    WHERE r.name <> 'guest' AND u.deleted_at IS NULL
    ORDER BY r.name, u.name
    `,
  );

  const attendanceResult = await getDb().query(
    `
    SELECT user_id, date, in_time, out_time, total_working_hr, ot, in_via, out_via
    FROM user_in_out_time
    WHERE date >= $1::date AND date <= $2::date AND deleted_at IS NULL
    `,
    [from, effectiveTo],
  );

  const attendanceByKey = new Map<
    string,
    {
      in_time?: string;
      out_time?: string;
      total_working_hr?: number;
      ot?: number;
      in_via?: string;
      out_via?: string;
    }
  >();
  for (const row of attendanceResult.rows) {
    const dateKey = normalizeDateKey(row.date as string | Date);
    if (!dateKey) continue;
    attendanceByKey.set(`${row.user_id}:${dateKey}`, {
      in_time: toIsoTimestamp(row.in_time as string | Date | null),
      out_time: toIsoTimestamp(row.out_time as string | Date | null),
      total_working_hr: row.total_working_hr != null ? Number(row.total_working_hr) : undefined,
      ot: row.ot != null ? Number(row.ot) : undefined,
      in_via: row.in_via ?? undefined,
      out_via: row.out_via ?? undefined,
    });
  }

  const dates = listDatesInclusive(from, effectiveTo);
  const holidayDates = await loadCompanyHolidayDates(getDb(), from, effectiveTo);

  const leaveResult = await getDb().query(
    `
    SELECT udl.user_id, udl.date, udl.leave_type_id, lt.name AS leave_type_name
    FROM user_day_leaves udl
    JOIN leave_types lt ON lt.id = udl.leave_type_id AND lt.deleted_at IS NULL
    WHERE udl.date >= $1::date AND udl.date <= $2::date AND udl.deleted_at IS NULL
    `,
    [from, effectiveTo],
  );

  const leaveByKey = new Map<
    string,
    { leave_type_id: string; leave_type_name: string }
  >();
  for (const row of leaveResult.rows) {
    const dateKey = normalizeDateKey(row.date as string | Date);
    if (!dateKey) continue;
    leaveByKey.set(`${row.user_id}:${dateKey}`, {
      leave_type_id: String(row.leave_type_id),
      leave_type_name: String(row.leave_type_name),
    });
  }

  const rows: AttendanceReportRow[] = [];

  for (const user of usersResult.rows) {
    const employmentStart =
      normalizeDateKey(user.created_at as string | Date) ?? from;
    const userFrom = maxDateKey(from, employmentStart);
    if (userFrom > effectiveTo) continue;

    for (const date of dates) {
      if (date < userFrom) continue;
      const entry = attendanceByKey.get(`${user.user_id}:${date}`);
      const inTime = entry?.in_time;
      const outTime = entry?.out_time;
      const leave = leaveByKey.get(`${user.user_id}:${date}`);
      const base = {
        user_id: String(user.user_id),
        user_name: user.user_name,
        email: user.email,
        role: user.role,
        department: user.department ?? undefined,
        date,
        in_time: inTime,
        out_time: outTime,
        total_working_hr: entry?.total_working_hr,
        ot: entry?.ot,
        in_via:
          entry?.in_via === 'self' || entry?.in_via === 'gatekeeper' ? entry.in_via : undefined,
        out_via:
          entry?.out_via === 'self' || entry?.out_via === 'gatekeeper' ? entry.out_via : undefined,
      };

      if (leave) {
        const leaveName = leave.leave_type_name.trim().toLowerCase();
        const isWorkFromHome = leaveName === 'work from home';
        rows.push({
          ...base,
          day_status: isWorkFromHome ? 'present' : 'leave',
          leave_type_id: isWorkFromHome ? undefined : leave.leave_type_id,
          leave_type_name: isWorkFromHome ? undefined : leave.leave_type_name,
        });
        continue;
      }

      rows.push({
        ...base,
        day_status: resolveReportingDayStatus(inTime, outTime, date, today, holidayDates),
      });
    }
  }

  return rows;
};
