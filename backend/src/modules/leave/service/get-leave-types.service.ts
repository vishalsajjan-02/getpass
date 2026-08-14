import { getDb } from '../../../config/database';
import type { LeaveType } from '../../../types';

const mapLeaveType = (row: Record<string, unknown>): LeaveType => ({
  id: String(row.id),
  name: String(row.name),
  is_paid: Boolean(row.is_paid),
  is_active: Boolean(row.is_active),
  sort_order: Number(row.sort_order),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

export const getLeaveTypes = async (options?: { includeInactive?: boolean }): Promise<LeaveType[]> => {
  const includeInactive = Boolean(options?.includeInactive);
  const result = await getDb().query(
    `SELECT id, name, is_paid, is_active, sort_order, created_at, updated_at
     FROM leave_types
     WHERE deleted_at IS NULL
     ${includeInactive ? '' : 'AND is_active = TRUE'}
     ORDER BY sort_order ASC, name ASC`,
  );

  return result.rows.map(mapLeaveType);
};
