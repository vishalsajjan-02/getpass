import bcrypt from 'bcryptjs';
import { getDb } from '../../../config/database';
import { signToken } from '../../../utils/jwt.utils';
import type { User, UserWithPassword } from '../../../types';
import { USER_WITH_PASSWORD_SELECT } from './shared/auth.shared';

export const loginWithCredentials = async (
  email: string,
  password: string,
): Promise<{ token: string; user: User }> => {
  const result = await getDb().query(
    `${USER_WITH_PASSWORD_SELECT} WHERE u.email = $1`,
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
