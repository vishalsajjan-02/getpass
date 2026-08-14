import { getDb } from '../../../config/database';
import { ensureUserExists } from '../../userInOutTime/service/shared/user-in-out-time.shared';
import { ensureLeaveAccrual } from './shared/leave-balance.shared';

export const setUserLeaveBalance = async (input: {
  userId: string;
  leaveBalance: number;
}): Promise<{ user_id: string; leave_balance: number }> => {
  await ensureUserExists(input.userId);

  if (!Number.isFinite(input.leaveBalance)) {
    throw new Error('leave_balance must be a number');
  }

  const pool = getDb();
  // Keep monthly accrual up to date, then set the admin-edited value.
  await ensureLeaveAccrual(input.userId, pool);

  const rounded = Math.round(input.leaveBalance * 100) / 100;
  const result = await pool.query(
    `UPDATE users
     SET leave_balance = $2,
         updated_at = NOW()
     WHERE id = $1
     RETURNING leave_balance`,
    [input.userId, rounded],
  );

  if (!result.rows[0]) throw new Error('User not found');

  return {
    user_id: input.userId,
    leave_balance: Number(result.rows[0].leave_balance),
  };
};
