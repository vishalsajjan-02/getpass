import bcrypt from 'bcryptjs';
import { getDb } from '../../../config/database';
import type { UpdateUserInput, User } from '../../../types';
import { getUserById, SALT_ROUNDS } from './shared/user.shared';

export const updateUser = async (id: string, input: UpdateUserInput): Promise<User> => {
  const pool = getDb();
  await getUserById(id);

  const extra: Record<string, unknown> = {};

  if (input.role) {
    const roleRow = await pool.query('SELECT id AS role_id FROM roles WHERE name = $1', [input.role]);
    if (!roleRow.rows[0]) throw new Error('Invalid role');
    extra.role_id = roleRow.rows[0].role_id;
  }

  if (input.password) {
    extra.password = await bcrypt.hash(input.password, SALT_ROUNDS);
  }

  const { password: _pw, ...inputWithoutPassword } = input;
  const merged = { ...inputWithoutPassword, ...extra };
  const entries = Object.entries(merged).filter(([, v]) => v !== undefined);
  if (!entries.length) return getUserById(id);

  const fields = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ');
  const values = [...entries.map(([, v]) => v), id];

  await pool.query(
    `UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $${values.length}`,
    values,
  );

  return getUserById(id);
};
