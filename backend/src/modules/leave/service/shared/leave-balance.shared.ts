import type { Pool } from 'pg';
import { getDb } from '../../../../config/database';
import {
  normalizeDateKey,
  todayDate,
} from '../../../userInOutTime/service/shared/user-in-out-time.shared';

/** Company credit: 1.75 paid leave days per calendar month. */
export const MONTHLY_PAID_LEAVE_ACCRUAL = 1.75;

const NON_BALANCE_LEAVE_NAMES = new Set([
  'work from home',
  'public holiday',
  'restricted holiday',
  'weekly off',
]);

export const currentMonthKey = (date = todayDate()): string => date.slice(0, 7);

export const monthKeyToIndex = (monthKey: string): number => {
  const [year, month] = monthKey.split('-').map(Number);
  return year * 12 + (month - 1);
};

/** Months strictly after `fromExclusive` through `toInclusive` (inclusive). */
export const monthsAfter = (fromExclusive: string, toInclusive: string): number => {
  return Math.max(0, monthKeyToIndex(toInclusive) - monthKeyToIndex(fromExclusive));
};

export const monthsInclusive = (fromInclusive: string, toInclusive: string): number => {
  return Math.max(0, monthKeyToIndex(toInclusive) - monthKeyToIndex(fromInclusive) + 1);
};

export const paidLeaveDaysCost = (leaveType: {
  name: string;
  is_paid: boolean;
}): number => {
  if (!leaveType.is_paid) return 0;
  const name = leaveType.name.trim().toLowerCase();
  if (NON_BALANCE_LEAVE_NAMES.has(name)) return 0;
  if (name === 'half-day leave' || name === 'half day leave') return 0.5;
  return 1;
};

export type UsedLeaveEntry = {
  date: string;
  leave_type_id: string;
  leave_type_name: string;
  days: number;
};

export const getUserUsedLeaves = async (
  userId: string,
  pool: Pool = getDb(),
): Promise<{ leave_used: number; used_leaves: UsedLeaveEntry[] }> => {
  const result = await pool.query(
    `SELECT udl.date, udl.leave_type_id, lt.name, lt.is_paid
     FROM user_day_leaves udl
     JOIN leave_types lt ON lt.id = udl.leave_type_id
     JOIN users u ON u.id = udl.user_id AND u.deleted_at IS NULL
     WHERE udl.user_id = $1
       AND udl.deleted_at IS NULL
       AND lt.deleted_at IS NULL
       AND udl.date >= u.created_at::date
     ORDER BY udl.date DESC`,
    [userId],
  );

  const used_leaves: UsedLeaveEntry[] = [];
  let leave_used = 0;

  for (const row of result.rows) {
    const days = paidLeaveDaysCost({
      name: String(row.name),
      is_paid: Boolean(row.is_paid),
    });
    if (days <= 0) continue;

    const date = normalizeDateKey(row.date as string | Date) ?? String(row.date).slice(0, 10);
    leave_used += days;
    used_leaves.push({
      date,
      leave_type_id: String(row.leave_type_id),
      leave_type_name: String(row.name),
      days,
    });
  }

  return {
    leave_used: Number(leave_used.toFixed(2)),
    used_leaves,
  };
};

export const getUserLeaveBalance = async (
  userId: string,
  pool: Pool = getDb(),
): Promise<number> => {
  const result = await pool.query(
    `SELECT leave_balance FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId],
  );
  if (!result.rows[0]) throw new Error('User not found');
  return Number(result.rows[0].leave_balance);
};

/**
 * Accrue 1.75 days for each month not yet credited, up to the current month.
 * Balance may later go negative when leave is taken beyond accrual.
 */
export const ensureLeaveAccrual = async (
  userId: string,
  pool: Pool = getDb(),
): Promise<number> => {
  const result = await pool.query(
    `SELECT leave_balance, leave_accrued_through
     FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId],
  );
  if (!result.rows[0]) throw new Error('User not found');

  const currentMonth = currentMonthKey();
  const accruedThrough =
    typeof result.rows[0].leave_accrued_through === 'string' &&
    /^\d{4}-\d{2}$/.test(result.rows[0].leave_accrued_through)
      ? result.rows[0].leave_accrued_through
      : null;

  let monthsToAdd = 0;
  if (!accruedThrough) {
    // First-time init: credit from January of the current year through this month.
    const year = Number(currentMonth.slice(0, 4));
    const yearStart = `${year}-01`;
    monthsToAdd = monthsInclusive(yearStart, currentMonth);
  } else if (accruedThrough < currentMonth) {
    monthsToAdd = monthsAfter(accruedThrough, currentMonth);
  }

  if (monthsToAdd <= 0) {
    return Number(result.rows[0].leave_balance);
  }

  const credit = Number((monthsToAdd * MONTHLY_PAID_LEAVE_ACCRUAL).toFixed(2));
  const updated = await pool.query(
    `UPDATE users
     SET leave_balance = leave_balance + $2,
         leave_accrued_through = $3,
         updated_at = NOW()
     WHERE id = $1
     RETURNING leave_balance`,
    [userId, credit, currentMonth],
  );

  return Number(updated.rows[0].leave_balance);
};

export const adjustLeaveBalance = async (
  userId: string,
  delta: number,
  pool: Pool = getDb(),
): Promise<number> => {
  await ensureLeaveAccrual(userId, pool);

  if (delta === 0) {
    return getUserLeaveBalance(userId, pool);
  }

  const updated = await pool.query(
    `UPDATE users
     SET leave_balance = ROUND((leave_balance + $2)::numeric, 2),
         updated_at = NOW()
     WHERE id = $1
     RETURNING leave_balance`,
    [userId, delta],
  );

  if (!updated.rows[0]) throw new Error('User not found');
  return Number(updated.rows[0].leave_balance);
};

/** Initial balance for a newly created user (current month credit). */
export const initialLeaveBalanceForNewUser = (): {
  leave_balance: number;
  leave_accrued_through: string;
} => ({
  leave_balance: MONTHLY_PAID_LEAVE_ACCRUAL,
  leave_accrued_through: currentMonthKey(),
});
