import { getDb } from '../config/database';

/** Tables that support soft delete via deleted_at. */
export const SOFT_DELETE_TABLES = [
  'roles',
  'gatepass_reasons',
  'departments',
  'leave_types',
  'company_holidays',
  'users',
  'user_day_leaves',
  'gatepasses',
  'gatepass_approval_requests',
  'user_in_out_time',
] as const;

export type SoftDeleteTable = (typeof SOFT_DELETE_TABLES)[number];

const TABLES_WITH_UPDATED_AT = new Set<SoftDeleteTable>([
  'leave_types',
  'company_holidays',
  'users',
  'user_day_leaves',
  'gatepasses',
  'gatepass_approval_requests',
  'user_in_out_time',
]);

export const softDeleteById = async (
  table: SoftDeleteTable,
  id: string,
): Promise<boolean> => {
  const setUpdated = TABLES_WITH_UPDATED_AT.has(table)
    ? ', updated_at = NOW()'
    : '';

  // leave_types / company_holidays also flip is_active for existing UI filters
  const setInactive =
    table === 'leave_types' || table === 'company_holidays'
      ? ', is_active = FALSE'
      : '';

  const result = await getDb().query(
    `UPDATE ${table}
     SET deleted_at = NOW()${setUpdated}${setInactive}
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [id],
  );

  return (result.rowCount ?? 0) > 0;
};

export const NOT_DELETED = 'deleted_at IS NULL';
