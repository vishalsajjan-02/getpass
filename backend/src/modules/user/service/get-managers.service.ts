import { getDb } from '../../../config/database';
import type { User } from '../../../types';

export const getManagers = async (): Promise<Pick<User, 'id' | 'name'>[]> => {
  const result = await getDb().query(
    `SELECT u.id, u.name
     FROM users u
     JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
     WHERE r.name = 'manager' AND u.deleted_at IS NULL
     ORDER BY u.name`,
  );
  return result.rows as Pick<User, 'id' | 'name'>[];
};
