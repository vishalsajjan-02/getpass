import { getDb } from '../../../../config/database';
import type { User } from '../../../../types';

export const USER_SELECT = `
  SELECT u.id, u.name, u.email, u.employee_id, r.name AS role, u.role_id,
         d.name AS department, u.department_id,
         u.manager_id, u.can_self_punch,
         u.face_image_path, u.face_registered_at,
         u.created_at, u.updated_at
  FROM users u
  JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
  LEFT JOIN departments d ON d.id = u.department_id AND d.deleted_at IS NULL
`;

export const USER_WITH_PASSWORD_SELECT = `
  SELECT u.id, u.name, u.email, u.password, u.employee_id, r.name AS role, u.role_id,
         d.name AS department, u.department_id,
         u.manager_id, u.can_self_punch,
         u.face_image_path, u.face_registered_at,
         u.created_at, u.updated_at
  FROM users u
  JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
  LEFT JOIN departments d ON d.id = u.department_id AND d.deleted_at IS NULL
`;

export const getMe = async (userId: string): Promise<User> => {
  const result = await getDb().query(
    `${USER_SELECT} WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) throw new Error('User not found');
  const facePath = row.face_image_path ? String(row.face_image_path) : null;
  return {
    ...row,
    employee_id:
      row.employee_id === null || row.employee_id === undefined
        ? null
        : String(row.employee_id),
    can_self_punch: Boolean(row.can_self_punch),
    face_image_path: facePath,
    face_image_url: facePath ? `/uploads/${facePath}` : null,
    face_registered_at: row.face_registered_at ? String(row.face_registered_at) : null,
    has_face: Boolean(facePath),
  } as User;
};
