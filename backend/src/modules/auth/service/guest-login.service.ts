import { getDb } from '../../../config/database';
import { signToken } from '../../../utils/jwt.utils';
import { env } from '../../../config/env';
import type { User } from '../../../types';
import { USER_SELECT } from './shared/auth.shared';

export const guestLogin = async (code: string): Promise<{ token: string; user: User }> => {
  if (!env.GUEST_CODES.includes(code)) {
    throw new Error('Invalid guest code');
  }

  const result = await getDb().query(`${USER_SELECT} WHERE r.name = 'guest' LIMIT 1`);
  const row = result.rows[0] as User | undefined;
  if (!row) throw new Error('No guest account configured. Run seed first.');

  const token = signToken({ userId: row.id, email: row.email, role: row.role });
  return { token, user: row };
};
