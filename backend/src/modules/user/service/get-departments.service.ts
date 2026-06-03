import { getDb } from '../../../config/database';
import type { DepartmentOption } from '../../../types';

export const getDepartments = async (): Promise<DepartmentOption[]> => {
  const result = await getDb().query(
    `SELECT id AS department_id, name FROM departments ORDER BY name`,
  );
  return result.rows as DepartmentOption[];
};
