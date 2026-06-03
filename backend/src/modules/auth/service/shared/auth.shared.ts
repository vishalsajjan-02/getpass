import { getDb } from '../../../../config/database';
import type { User } from '../../../../types';

export const USER_SELECT = `
  SELECT u.id, u.name, u.email, r.name AS role, u.role_id,
         d.name AS department, u.department_id,
         u.manager_id, u.created_at, u.updated_at
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN departments d ON d.id = u.department_id
`;

export const USER_WITH_PASSWORD_SELECT = `
  SELECT u.id, u.name, u.email, u.password, r.name AS role, u.role_id,
         d.name AS department, u.department_id,
         u.manager_id, u.created_at, u.updated_at
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN departments d ON d.id = u.department_id
`;

export const getMe = async (userId: string): Promise<User> => {
  const result = await getDb().query(`${USER_SELECT} WHERE u.id = $1`, [userId]);
  const row = result.rows[0] as User | undefined;
  if (!row) throw new Error('User not found');
  return row;
};
