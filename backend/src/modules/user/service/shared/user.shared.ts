import { getDb } from '../../../../config/database';
import type { User } from '../../../../types';

export const SALT_ROUNDS = 10;

export const USER_SELECT = `
  SELECT u.id, u.name, u.email, u.employee_id, r.name AS role, u.role_id,
         d.name AS department, u.department_id,
         u.manager_id, u.leave_balance, u.can_self_punch,
         u.face_image_path, u.face_registered_at,
         u.created_at, u.updated_at
  FROM users u
  JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
  LEFT JOIN departments d ON d.id = u.department_id AND d.deleted_at IS NULL
`;

export const normalizeEmployeeId = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const normalizeEmail = (value?: string | null): string => {
  const trimmed = value?.trim().toLowerCase() ?? '';
  if (!trimmed) throw new Error('Email is required');
  return trimmed;
};

export const assertEmailAvailable = async (
  email: string,
  excludeUserId?: string,
): Promise<void> => {
  const params: string[] = [email];
  let sql =
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL';
  if (excludeUserId) {
    params.push(excludeUserId);
    sql += ' AND id <> $2';
  }
  const dup = await getDb().query(sql, params);
  if (dup.rows[0]) throw new Error('Email already in use');
};

export const assertEmployeeIdAvailable = async (
  employeeId: string | null,
  excludeUserId?: string,
): Promise<void> => {
  if (!employeeId) return;
  const params: string[] = [employeeId];
  let sql =
    'SELECT id FROM users WHERE LOWER(employee_id) = LOWER($1) AND deleted_at IS NULL';
  if (excludeUserId) {
    params.push(excludeUserId);
    sql += ' AND id <> $2';
  }
  const dup = await getDb().query(sql, params);
  if (dup.rows[0]) throw new Error('Employee ID already in use');
};

export const mapUserRow = (row: Record<string, unknown>): User => {
  const facePath = row.face_image_path ? String(row.face_image_path) : null;
  return {
    ...row,
    employee_id:
      row.employee_id === null || row.employee_id === undefined
        ? null
        : String(row.employee_id),
    leave_balance:
      row.leave_balance === null || row.leave_balance === undefined
        ? undefined
        : Number(row.leave_balance),
    can_self_punch: Boolean(row.can_self_punch),
    face_image_path: facePath,
    face_image_url: facePath ? `/uploads/${facePath}` : null,
    face_registered_at: row.face_registered_at ? String(row.face_registered_at) : null,
    has_face: Boolean(facePath),
  } as User;
};

export const getUserById = async (id: string): Promise<User> => {
  const result = await getDb().query(
    `${USER_SELECT} WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [id],
  );
  const row = result.rows[0];
  if (!row) throw new Error('User not found');
  return mapUserRow(row);
};

export const resolveDepartmentId = async (department?: string): Promise<string | null> => {
  if (!department?.trim()) return null;

  const pool = getDb();
  const byId = await pool.query(
    'SELECT id FROM departments WHERE id::text = $1 AND deleted_at IS NULL',
    [department.trim()],
  );
  if (byId.rows[0]?.id) return byId.rows[0].id as string;

  const byName = await pool.query(
    'SELECT id FROM departments WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL',
    [department.trim()],
  );
  return (byName.rows[0]?.id as string | undefined) ?? null;
};

export const resolveManagerId = async (managerEmail?: string): Promise<string | null> => {
  if (!managerEmail?.trim()) return null;

  const result = await getDb().query(
    `SELECT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
     WHERE LOWER(u.email) = LOWER($1) AND r.name = 'manager' AND u.deleted_at IS NULL`,
    [managerEmail.trim()],
  );
  return (result.rows[0]?.id as string | undefined) ?? null;
};
