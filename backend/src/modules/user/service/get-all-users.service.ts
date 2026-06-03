import { getDb } from '../../../config/database';
import type { User } from '../../../types';
import { USER_SELECT } from './shared/user.shared';

export const getAllUsers = async (): Promise<User[]> => {
  const result = await getDb().query(`${USER_SELECT} ORDER BY r.name, u.name`);
  return result.rows as User[];
};
