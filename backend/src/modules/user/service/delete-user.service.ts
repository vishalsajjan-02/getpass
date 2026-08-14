import { getDb } from '../../../config/database';
import { getUserById } from './shared/user.shared';
import { softDeleteById } from '../../../utils/soft-delete';

export const deleteUser = async (id: string): Promise<void> => {
  await getUserById(id);
  const deleted = await softDeleteById('users', id);
  if (!deleted) throw new Error('User not found or already deleted');

  // Soft-delete related day leaves and attendance rows for this user.
  await getDb().query(
    `UPDATE user_day_leaves
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE user_id = $1 AND deleted_at IS NULL`,
    [id],
  );
  await getDb().query(
    `UPDATE user_in_out_time
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE user_id = $1 AND deleted_at IS NULL`,
    [id],
  );
  await getDb().query(
    `UPDATE gatepasses
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE user_id = $1 AND deleted_at IS NULL`,
    [id],
  );
};
