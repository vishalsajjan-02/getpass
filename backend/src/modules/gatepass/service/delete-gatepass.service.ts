import { getDb } from '../../../config/database';
import { getGatepassByIdInternal } from './shared/gatepass.shared';
import type { UserRole } from '../../../types';

export const deleteGatepass = async (id: string, actorUserId: string, actorRole: UserRole): Promise<void> => {
  const gatepass = await getGatepassByIdInternal(getDb(), id);

  if (actorRole !== 'admin' && gatepass.user_id !== actorUserId) {
    throw new Error('You are not allowed to delete this gatepass');
  }

  await getDb().query('DELETE FROM gatepasses WHERE id = $1', [id]);
};
