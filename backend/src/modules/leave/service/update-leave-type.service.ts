import { getDb } from '../../../config/database';
import type { LeaveType } from '../../../types';
import { getLeaveTypes } from './get-leave-types.service';

export type UpdateLeaveTypeInput = {
  id: string;
  name?: string;
  is_paid?: boolean;
  is_active?: boolean;
  sort_order?: number;
};

export const updateLeaveType = async (input: UpdateLeaveTypeInput): Promise<LeaveType> => {
  if (!input.id) throw new Error('id is required');

  const existing = await getDb().query(`SELECT id FROM leave_types WHERE id = $1`, [input.id]);
  if (existing.rowCount === 0) throw new Error('Leave type not found');

  const name = input.name?.trim();

  await getDb().query(
    `UPDATE leave_types SET
       name = COALESCE($2, name),
       is_paid = COALESCE($3, is_paid),
       is_active = COALESCE($4, is_active),
       sort_order = COALESCE($5, sort_order),
       updated_at = NOW()
     WHERE id = $1`,
    [
      input.id,
      name ?? null,
      input.is_paid ?? null,
      input.is_active ?? null,
      input.sort_order ?? null,
    ],
  );

  const types = await getLeaveTypes({ includeInactive: true });
  const updated = types.find((row) => row.id === input.id);
  if (!updated) throw new Error('Failed to load updated leave type');
  return updated;
};
