import { getDb } from '../../../config/database';
import { emitAttendanceSocketEvent } from '../../../realtime/socket';
import type { UserInOutTime } from '../../../types';
import {
  ensureUserExists,
  isValidDate,
  normalizeDateKey,
  todayDate,
  calcWorkingHours,
  workingHoursSqlSet,
} from './shared/user-in-out-time.shared';
import { upsertUserDayLeave } from '../../leave/service/upsert-user-day-leave.service';

export type DayAttendanceStatus = 'present' | 'absent';

const mapRow = (row: Record<string, unknown>): UserInOutTime => ({
  id: String(row.id),
  user_id: String(row.user_id),
  date: normalizeDateKey(row.date as string | Date) ?? String(row.date).slice(0, 10),
  in_time: row.in_time ? String(row.in_time) : undefined,
  out_time: row.out_time ? String(row.out_time) : undefined,
  total_working_hr: row.total_working_hr != null ? Number(row.total_working_hr) : undefined,
  ot: row.ot != null ? Number(row.ot) : undefined,
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

export const setDayAttendanceStatus = async (input: {
  userId: string;
  date: string;
  status: DayAttendanceStatus;
}): Promise<{
  user_id: string;
  date: string;
  status: DayAttendanceStatus;
  leave_balance: number;
  attendance?: UserInOutTime;
}> => {
  await ensureUserExists(input.userId);

  const dateKey = normalizeDateKey(input.date);
  if (!dateKey || !isValidDate(dateKey)) {
    throw new Error('Invalid date. Use YYYY-MM-DD');
  }

  if (input.status !== 'present' && input.status !== 'absent') {
    throw new Error('status must be present or absent');
  }

  // Clear any leave marking for the day (refunds paid leave balance if needed).
  const leaveResult = await upsertUserDayLeave({
    userId: input.userId,
    date: dateKey,
    leaveTypeId: null,
  });

  const pool = getDb();
  const isToday = dateKey === todayDate();

  if (input.status === 'absent') {
    await pool.query(
      `UPDATE user_in_out_time
       SET in_time = NULL,
           out_time = NULL,
           total_working_hr = 0,
           ot = 0,
           deleted_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1 AND date = $2::date AND deleted_at IS NULL`,
      [input.userId, dateKey],
    );

    emitAttendanceSocketEvent({
      user_id: input.userId,
      date: dateKey,
      state: 'absent',
    });

    return {
      user_id: input.userId,
      date: dateKey,
      status: 'absent',
      leave_balance: leaveResult.leave_balance,
    };
  }

  // Today: check-in only (in_time) so employee can still request gatepasses.
  // Past days: fill default in/out for reporting.
  const result = isToday
    ? await pool.query(
        `
        INSERT INTO user_in_out_time (user_id, date, in_time, total_working_hr, ot, deleted_at)
        VALUES ($1, $2::date, NOW(), 0, 0, NULL)
        ON CONFLICT (user_id, date) DO UPDATE SET
          in_time = COALESCE(user_in_out_time.in_time, EXCLUDED.in_time),
          out_time = NULL,
          total_working_hr = 0,
          ot = 0,
          deleted_at = NULL,
          updated_at = NOW()
        RETURNING id, user_id, date, in_time, out_time, total_working_hr, ot, created_at, updated_at
        `,
        [input.userId, dateKey],
      )
    : await pool.query(
        `
        INSERT INTO user_in_out_time (
          user_id, date, in_time, out_time, total_working_hr, ot, deleted_at
        )
        VALUES (
          $1,
          $2::date,
          ($2::date + TIME '09:30') AT TIME ZONE 'Asia/Kolkata',
          ($2::date + TIME '19:00') AT TIME ZONE 'Asia/Kolkata',
          9.50,
          0,
          NULL
        )
        ON CONFLICT (user_id, date) DO UPDATE SET
          in_time = COALESCE(user_in_out_time.in_time, EXCLUDED.in_time),
          out_time = COALESCE(
            user_in_out_time.out_time,
            COALESCE(user_in_out_time.in_time, EXCLUDED.in_time) + INTERVAL '9 hours 30 minutes'
          ),
          ${workingHoursSqlSet('COALESCE(user_in_out_time.out_time, EXCLUDED.out_time)')},
          deleted_at = NULL,
          updated_at = NOW()
        RETURNING id, user_id, date, in_time, out_time, total_working_hr, ot, created_at, updated_at
        `,
        [input.userId, dateKey],
      );

  let attendance = mapRow(result.rows[0]);
  // Ensure hours are stored if conflict path left them stale.
  if (attendance.in_time && attendance.out_time && attendance.total_working_hr == null) {
    const hours = calcWorkingHours(attendance.in_time, attendance.out_time);
    await pool.query(
      `UPDATE user_in_out_time
       SET total_working_hr = $3, ot = $4, updated_at = NOW()
       WHERE user_id = $1 AND date = $2::date AND deleted_at IS NULL`,
      [input.userId, dateKey, hours.total_working_hr, hours.ot],
    );
    attendance = { ...attendance, ...hours };
  }
  emitAttendanceSocketEvent({
    user_id: input.userId,
    date: dateKey,
    state: attendance.out_time ? 'left' : 'present',
    in_time: attendance.in_time,
    out_time: attendance.out_time,
  });

  return {
    user_id: input.userId,
    date: dateKey,
    status: 'present',
    leave_balance: leaveResult.leave_balance,
    attendance,
  };
};
