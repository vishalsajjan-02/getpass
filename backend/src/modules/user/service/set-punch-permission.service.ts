import { getDb } from '../../../config/database';
import { emitPunchPermissionSocketEvent } from '../../../realtime/socket';
import type { User } from '../../../types';
import { getUserById } from './shared/user.shared';

export const setPunchPermission = async (
  userId: string,
  canSelfPunch: boolean,
): Promise<User> => {
  const user = await getUserById(userId);
  if (user.role !== 'employee' && user.role !== 'manager') {
    throw new Error('Punch permission can only be set for employees and managers');
  }

  await getDb().query(
    `UPDATE users
     SET can_self_punch = $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL`,
    [canSelfPunch, userId],
  );

  const updated = await getUserById(userId);
  emitPunchPermissionSocketEvent({
    user_id: updated.id,
    can_self_punch: Boolean(updated.can_self_punch),
  });
  return updated;
};
