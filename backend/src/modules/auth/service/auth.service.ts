import bcrypt from 'bcryptjs';
import { getDb } from '../../../config/database';
import { signToken } from '../../../utils/jwt.utils';
import { env } from '../../../config/env';
import type { User, UserWithPassword } from '../../../types';

const USER_SELECT = `
  SELECT u.id, u.name, u.email, u.role, u.role_id,
         d.name AS department, u.department_id,
         u.manager_id, u.created_at, u.updated_at
  FROM users u
  LEFT JOIN departments d ON d.department_id = u.department_id
`;

export const loginWithCredentials = async (
  email: string,
  password: string,
): Promise<{ token: string; user: User }> => {
  const pool = getDb();
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email],
  );
  const row = result.rows[0] as UserWithPassword | undefined;

  if (!row) throw new Error('Invalid email or password');

  const valid = await bcrypt.compare(password, row.password);
  if (!valid) throw new Error('Invalid email or password');

  const { password: _pw, ...user } = row;
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  return { token, user: user as User };
};

export const guestLogin = async (code: string): Promise<{ token: string; user: User }> => {
  if (!env.GUEST_CODES.includes(code)) {
    throw new Error('Invalid guest code');
  }

  const pool = getDb();
  const result = await pool.query(
    `${USER_SELECT} WHERE u.role = 'guest' LIMIT 1`,
  );
  const row = result.rows[0] as User | undefined;
  if (!row) throw new Error('No guest account configured. Run seed first.');

  const token = signToken({ userId: row.id, email: row.email, role: row.role });
  return { token, user: row };
};

export const getMe = async (userId: string): Promise<User> => {
  const pool = getDb();
  const result = await pool.query(
    `${USER_SELECT} WHERE u.id = $1`,
    [userId],
  );
  const row = result.rows[0] as User | undefined;
  if (!row) throw new Error('User not found');
  return row;
};
