import { getDb } from '../../../config/database';
import { buildVisibilityClause, runGatepassQuery } from './shared/gatepass.shared';
import type { GatepassWithProfile, UserRole } from '../../../types';

export const getGatepassById = async (
  id: string,
  actorUserId: string,
  actorRole: UserRole,
): Promise<GatepassWithProfile> => {
  const gatepasses = await runGatepassQuery(
    getDb(),
    [
      'g.id = $1',
      ...(buildVisibilityClause(actorRole, actorUserId, 2).clause
        ? [buildVisibilityClause(actorRole, actorUserId, 2).clause as string]
        : []),
    ],
    [
      id,
      ...buildVisibilityClause(actorRole, actorUserId, 2).params,
    ],
  );

  const gatepass = gatepasses[0];
  if (!gatepass) throw new Error('Gatepass not found');
  return gatepass;
};
