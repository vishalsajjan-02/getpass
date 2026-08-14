import { getDb } from '../../../config/database';
import { ensureUserExists, isValidDate, normalizeDateKey } from '../../userInOutTime/service/shared/user-in-out-time.shared';
import {
  adjustLeaveBalance,
  ensureLeaveAccrual,
  paidLeaveDaysCost,
} from './shared/leave-balance.shared';

export type UserDayLeaveResult = {
  user_id: string;
  date: string;
  leave_type_id?: string;
  leave_type_name?: string;
  leave_balance: number;
};

export const upsertUserDayLeave = async (input: {
  userId: string;
  date: string;
  leaveTypeId: string | null;
}): Promise<UserDayLeaveResult> => {
  await ensureUserExists(input.userId);

  const dateKey = normalizeDateKey(input.date);
  if (!dateKey || !isValidDate(dateKey)) {
    throw new Error('Invalid date. Use YYYY-MM-DD');
  }

  const pool = getDb();
  await ensureLeaveAccrual(input.userId, pool);

  const existing = await pool.query(
    `SELECT udl.leave_type_id, lt.name, lt.is_paid
     FROM user_day_leaves udl
     JOIN leave_types lt ON lt.id = udl.leave_type_id
     WHERE udl.user_id = $1 AND udl.date = $2::date AND udl.deleted_at IS NULL`,
    [input.userId, dateKey],
  );

  const previousCost = existing.rows[0]
    ? paidLeaveDaysCost({
        name: String(existing.rows[0].name),
        is_paid: Boolean(existing.rows[0].is_paid),
      })
    : 0;

  if (!input.leaveTypeId) {
    await pool.query(
      `UPDATE user_day_leaves
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND date = $2::date AND deleted_at IS NULL`,
      [input.userId, dateKey],
    );
    const leaveBalance = await adjustLeaveBalance(input.userId, previousCost, pool);
    return { user_id: input.userId, date: dateKey, leave_balance: leaveBalance };
  }

  const leaveType = await pool.query(
    `SELECT id, name, is_paid FROM leave_types
     WHERE id = $1 AND is_active = TRUE AND deleted_at IS NULL`,
    [input.leaveTypeId],
  );
  if (!leaveType.rows[0]) {
    throw new Error('Invalid leave type');
  }

  const nextCost = paidLeaveDaysCost({
    name: String(leaveType.rows[0].name),
    is_paid: Boolean(leaveType.rows[0].is_paid),
  });

  // Revive soft-deleted row for same user/date, or insert/update active row.
  await pool.query(
    `INSERT INTO user_day_leaves (user_id, date, leave_type_id, deleted_at)
     VALUES ($1, $2::date, $3, NULL)
     ON CONFLICT (user_id, date) DO UPDATE SET
       leave_type_id = EXCLUDED.leave_type_id,
       deleted_at = NULL,
       updated_at = NOW()`,
    [input.userId, dateKey, input.leaveTypeId],
  );

  const leaveBalance = await adjustLeaveBalance(
    input.userId,
    previousCost - nextCost,
    pool,
  );

  return {
    user_id: input.userId,
    date: dateKey,
    leave_type_id: String(leaveType.rows[0].id),
    leave_type_name: String(leaveType.rows[0].name),
    leave_balance: leaveBalance,
  };
};
