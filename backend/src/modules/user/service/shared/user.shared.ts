import { getDb } from '../../../../config/database';
import type { User } from '../../../../types';

export const SALT_ROUNDS = 10;

export const USER_SELECT = `
  SELECT u.id, u.name, u.email, r.name AS role, u.role_id,
         d.name AS department, u.department_id,
         u.manager_id, u.created_at, u.updated_at
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN departments d ON d.id = u.department_id
`;

export const getUserById = async (id: string): Promise<User> => {
  const result = await getDb().query(`${USER_SELECT} WHERE u.id = $1`, [id]);
  const row = result.rows[0] as User | undefined;
  if (!row) throw new Error('User not found');
  return row;
};

export const resolveDepartmentId = async (department?: string): Promise<string | null> => {
  if (!department?.trim()) return null;

  const pool = getDb();
  const byId = await pool.query('SELECT id FROM departments WHERE id::text = $1', [department.trim()]);
  if (byId.rows[0]?.id) return byId.rows[0].id as string;

  const byName = await pool.query(
    'SELECT id FROM departments WHERE LOWER(name) = LOWER($1)',
    [department.trim()],
  );
  return (byName.rows[0]?.id as string | undefined) ?? null;
};

export const resolveManagerId = async (managerEmail?: string): Promise<string | null> => {
  if (!managerEmail?.trim()) return null;

  const result = await getDb().query(
    `SELECT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE LOWER(u.email) = LOWER($1) AND r.name = 'manager'`,
    [managerEmail.trim()],
  );
  return (result.rows[0]?.id as string | undefined) ?? null;
};
