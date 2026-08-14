import { getDb } from '../../../config/database';
import { softDeleteById } from '../../../utils/soft-delete';

export const deleteLeaveType = async (id: string): Promise<{ id: string }> => {
  if (!id) throw new Error('id is required');

  const deleted = await softDeleteById('leave_types', id);
  if (!deleted) throw new Error('Leave type not found or already deleted');
  return { id };
};
