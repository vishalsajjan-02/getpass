import { getDailyReport } from './get-daily-report.service';
import { getDb } from '../../../config/database';
import type {
  AttendanceGridDay,
  AttendanceGridResponse,
  AttendanceGridUser,
} from '../../../types';
import {
  isValidDate,
  loadCompanyHolidayDates,
  maxDateKey,
  normalizeDateKey,
  resolveReportingDayStatus,
  toIsoTimestamp,
  todayDate,
} from './shared/user-in-out-time.shared';
import { resolveAttendanceRange } from './get-attendance-report.service';

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

const loadMonthSources = async (from: string, effectiveTo: string) => {
  const db = getDb();
  const [usersResult, attendanceResult, leaveResult, holidayDates] = await Promise.all([
    db.query(
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
    ),
    db.query(
      `
      SELECT user_id, date, in_time, out_time, total_working_hr, ot, in_via, out_via
      FROM user_in_out_time
      WHERE date >= $1::date AND date <= $2::date AND deleted_at IS NULL
      `,
      [from, effectiveTo],
    ),
    db.query(
      `
      SELECT udl.user_id, udl.date, udl.leave_type_id, lt.name AS leave_type_name
      FROM user_day_leaves udl
      JOIN leave_types lt ON lt.id = udl.leave_type_id AND lt.deleted_at IS NULL
      WHERE udl.date >= $1::date AND udl.date <= $2::date AND udl.deleted_at IS NULL
      `,
      [from, effectiveTo],
    ),
    loadCompanyHolidayDates(db, from, effectiveTo),
  ]);

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

  return { usersResult, attendanceByKey, leaveByKey, holidayDates };
};

const buildDayCell = (
  userId: string,
  date: string,
  today: string,
  attendanceByKey: Map<
    string,
    { in_time?: string; out_time?: string; total_working_hr?: number; ot?: number }
  >,
  leaveByKey: Map<string, { leave_type_id: string; leave_type_name: string }>,
  holidayDates: Set<string>,
): AttendanceGridDay => {
  const entry = attendanceByKey.get(`${userId}:${date}`);
  const inTime = entry?.in_time;
  const outTime = entry?.out_time;
  const leave = leaveByKey.get(`${userId}:${date}`);

  if (leave) {
    const leaveName = leave.leave_type_name.trim().toLowerCase();
    const isWorkFromHome = leaveName === 'work from home';
    return {
      in_time: inTime,
      out_time: outTime,
      total_working_hr: entry?.total_working_hr,
      ot: entry?.ot,
      day_status: isWorkFromHome ? 'present' : 'leave',
      leave_type_name: isWorkFromHome ? undefined : leave.leave_type_name,
    };
  }

  return {
    in_time: inTime,
    out_time: outTime,
    total_working_hr: entry?.total_working_hr,
    ot: entry?.ot,
    day_status: resolveReportingDayStatus(inTime, outTime, date, today, holidayDates),
  };
};

/** Compact month grid — one user row with day array (mobile-friendly, single API). */
export const getAttendanceGridReport = async (params: {
  date?: string;
  month?: string;
  from?: string;
  to?: string;
}): Promise<AttendanceGridResponse> => {
  const { from, to } = resolveAttendanceRange(params);
  const today = todayDate();
  const effectiveTo = to > today ? today : to;

  if (from > effectiveTo) {
    return {
      month: params.month ?? from.slice(0, 7),
      from,
      to: effectiveTo,
      dates: [],
      users: [],
      stats: { user_count: 0, present_days: 0, absent_days: 0 },
    };
  }

  if (from === to) {
    const daily = await getDailyReport(from);
    const users: AttendanceGridUser[] = daily.map((row) => ({
      user_id: row.user_id,
      user_name: row.user_name,
      email: row.email,
      department: row.department,
      days: [
        {
          in_time: row.in_time,
          out_time: row.out_time,
          total_working_hr: row.total_working_hr,
          ot: row.ot,
          day_status:
            row.day_status ??
            resolveReportingDayStatus(row.in_time, row.out_time, row.date, today),
        },
      ],
    }));
    return {
      month: from.slice(0, 7),
      from,
      to: effectiveTo,
      dates: [from],
      users,
      stats: {
        user_count: users.length,
        present_days: users.filter((u) => u.days[0]?.in_time).length,
        absent_days: users.filter((u) => u.days[0]?.day_status === 'absent').length,
      },
    };
  }

  const dates = listDatesInclusive(from, effectiveTo);
  const { usersResult, attendanceByKey, leaveByKey, holidayDates } = await loadMonthSources(
    from,
    effectiveTo,
  );

  let presentDays = 0;
  let absentDays = 0;
  const users: AttendanceGridUser[] = [];

  for (const user of usersResult.rows) {
    const employmentStart =
      normalizeDateKey(user.created_at as string | Date) ?? from;
    const userFrom = maxDateKey(from, employmentStart);
    if (userFrom > effectiveTo) continue;

    const days: AttendanceGridDay[] = [];
    for (const date of dates) {
      if (date < userFrom) {
        days.push({ day_status: 'weekly_off' });
        continue;
      }
      const day = buildDayCell(
        String(user.user_id),
        date,
        today,
        attendanceByKey,
        leaveByKey,
        holidayDates,
      );
      days.push(day);
      if (day.in_time) presentDays += 1;
      if (day.day_status === 'absent') absentDays += 1;
    }

    users.push({
      user_id: String(user.user_id),
      user_name: user.user_name,
      email: user.email,
      department: user.department ?? undefined,
      days,
    });
  }

  return {
    month: params.month ?? from.slice(0, 7),
    from,
    to: effectiveTo,
    dates,
    users,
    stats: {
      user_count: users.length,
      present_days: presentDays,
      absent_days: absentDays,
    },
  };
};
