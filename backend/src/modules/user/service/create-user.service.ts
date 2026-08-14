import bcrypt from 'bcryptjs';
import { getDb } from '../../../config/database';
import type { CreateUserInput, User } from '../../../types';
import {
  getUserById,
  SALT_ROUNDS,
  normalizeEmail,
  normalizeEmployeeId,
  assertEmailAvailable,
  assertEmployeeIdAvailable,
} from './shared/user.shared';
import {
  currentMonthKey,
  initialLeaveBalanceForNewUser,
} from '../../leave/service/shared/leave-balance.shared';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  const pool = getDb();
  const email = normalizeEmail(input.email);
  await assertEmailAvailable(email);

  const roleRow = await pool.query(
    'SELECT id AS role_id FROM roles WHERE name = $1 AND deleted_at IS NULL',
    [input.role],
  );
  if (!roleRow.rows[0]) throw new Error('Invalid role');
  const roleId: string = roleRow.rows[0].role_id;

  const hashed = await bcrypt.hash(input.password, SALT_ROUNDS);
  const defaults = initialLeaveBalanceForNewUser();
  const leaveBalance =
    typeof input.leave_balance === 'number' && Number.isFinite(input.leave_balance)
      ? Math.round(input.leave_balance * 100) / 100
      : defaults.leave_balance;
  const employeeId = normalizeEmployeeId(input.employee_id);
  await assertEmployeeIdAvailable(employeeId);

  const inserted = await pool.query(
    `INSERT INTO users
       (name, email, password, role_id, department_id, manager_id, leave_balance, leave_accrued_through, employee_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      input.name,
      email,
      hashed,
      roleId,
      input.department_id ?? null,
      input.manager_id ?? null,
      leaveBalance,
      currentMonthKey(),
      employeeId,
    ],
  );

  return getUserById(inserted.rows[0].id);
};
