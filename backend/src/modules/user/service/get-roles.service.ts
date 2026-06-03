import { getDb } from '../../../config/database';
import type { RoleOption } from '../../../types';

export const getRoles = async (): Promise<RoleOption[]> => {
  const result = await getDb().query(
    `SELECT id AS role_id, name FROM roles
     ORDER BY CASE name
       WHEN 'admin'      THEN 1
       WHEN 'manager'    THEN 2
       WHEN 'gatekeeper' THEN 3
       WHEN 'employee'   THEN 4
       WHEN 'guest'      THEN 5
       ELSE 6
     END`,
  );
  return result.rows as RoleOption[];
};
