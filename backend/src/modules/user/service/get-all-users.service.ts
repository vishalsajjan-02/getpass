import { getDb } from '../../../config/database';
import type { User } from '../../../types';
import { mapUserRow, USER_SELECT } from './shared/user.shared';

export const getAllUsers = async (): Promise<User[]> => {
  const result = await getDb().query(
    `${USER_SELECT} WHERE u.deleted_at IS NULL ORDER BY r.name, u.name`,
  );
  return result.rows.map((row) => mapUserRow(row));
};
