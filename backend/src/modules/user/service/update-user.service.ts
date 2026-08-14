import bcrypt from 'bcryptjs';
import { getDb } from '../../../config/database';
import type { UpdateUserInput, User } from '../../../types';
import {
  getUserById,
  SALT_ROUNDS,
  normalizeEmail,
  normalizeEmployeeId,
  assertEmailAvailable,
  assertEmployeeIdAvailable,
} from './shared/user.shared';

const ALLOWED_UPDATE_KEYS = new Set([
  'name',
  'email',
  'password',
  'role_id',
  'department_id',
  'manager_id',
  'employee_id',
  'leave_balance',
]);

export const updateUser = async (id: string, input: UpdateUserInput): Promise<User> => {
  const pool = getDb();
  await getUserById(id);

  const extra: Record<string, unknown> = {};

  if (input.role) {
    const roleRow = await pool.query(
      'SELECT id AS role_id FROM roles WHERE name = $1 AND deleted_at IS NULL',
      [input.role],
    );
    if (!roleRow.rows[0]) throw new Error('Invalid role');
    extra.role_id = roleRow.rows[0].role_id;
    // Manager is only relevant for employees
    if (input.role !== 'employee' && input.manager_id === undefined) {
      extra.manager_id = null;
    }
  }

  if (input.password) {
    extra.password = await bcrypt.hash(input.password, SALT_ROUNDS);
  }

  if ('email' in input && input.email !== undefined) {
    const email = normalizeEmail(input.email);
    await assertEmailAvailable(email, id);
    extra.email = email;
  }

  if ('employee_id' in input) {
    const employeeId = normalizeEmployeeId(input.employee_id);
    await assertEmployeeIdAvailable(employeeId, id);
    extra.employee_id = employeeId;
  }

  // Strip non-column fields (role name, password, email, employee_id handled above)
  const { password: _pw, employee_id: _eid, email: _email, role: _role, ...rest } = input;
  const merged = { ...rest, ...extra };
  const entries = Object.entries(merged).filter(
    ([k, v]) => ALLOWED_UPDATE_KEYS.has(k) && v !== undefined,
  );
  if (!entries.length) return getUserById(id);

  const fields = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ');
  const values = [...entries.map(([, v]) => v), id];

  try {
    await pool.query(
      `UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $${values.length} AND deleted_at IS NULL`,
      values,
    );
  } catch (err) {
    const msg = String((err as Error)?.message ?? '');
    if (/idx_users_email_active|users_email/i.test(msg)) {
      throw new Error('Email already in use');
    }
    if (/idx_users_employee_id/i.test(msg)) {
      throw new Error('Employee ID already in use');
    }
    throw err;
  }

  return getUserById(id);
};
