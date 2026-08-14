import { getDb } from '../../../config/database';
import { getGatepassByIdInternal } from './shared/gatepass.shared';
import type { UserRole } from '../../../types';
import { softDeleteById } from '../../../utils/soft-delete';

export const deleteGatepass = async (id: string, actorUserId: string, actorRole: UserRole): Promise<void> => {
  const gatepass = await getGatepassByIdInternal(getDb(), id);

  if (actorRole !== 'admin' && gatepass.user_id !== actorUserId) {
    throw new Error('You are not allowed to delete this gatepass');
  }

  const deleted = await softDeleteById('gatepasses', id);
  if (!deleted) throw new Error('Gatepass not found or already deleted');

  await getDb().query(
    `UPDATE gatepass_approval_requests
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE gatepass_id = $1 AND deleted_at IS NULL`,
    [id],
  );
};
