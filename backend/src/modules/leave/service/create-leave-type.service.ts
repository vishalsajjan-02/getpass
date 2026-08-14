import { getDb } from '../../../config/database';
import type { LeaveType } from '../../../types';
import { getLeaveTypes } from './get-leave-types.service';

export type CreateLeaveTypeInput = {
  name: string;
  is_paid?: boolean;
  sort_order?: number;
};

export const createLeaveType = async (input: CreateLeaveTypeInput): Promise<LeaveType> => {
  const name = input.name?.trim();
  if (!name) throw new Error('name is required');

  const isPaid = input.is_paid !== false;
  const sortOrder = Number.isFinite(input.sort_order) ? Number(input.sort_order) : 0;

  const result = await getDb().query(
    `INSERT INTO leave_types (name, is_paid, is_active, sort_order, deleted_at)
     VALUES ($1, $2, TRUE, $3, NULL)
     ON CONFLICT (name) WHERE deleted_at IS NULL DO UPDATE SET
       is_paid = EXCLUDED.is_paid,
       is_active = TRUE,
       sort_order = EXCLUDED.sort_order,
       deleted_at = NULL,
       updated_at = NOW()
     RETURNING id`,
    [name, isPaid, sortOrder],
  );

  const types = await getLeaveTypes({ includeInactive: true });
  const created = types.find((row) => row.id === String(result.rows[0].id));
  if (!created) throw new Error('Failed to load created leave type');
  return created;
};
