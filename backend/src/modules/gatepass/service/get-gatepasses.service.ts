import { getDb } from '../../../config/database';
import { buildVisibilityClause, runGatepassQuery } from './shared/gatepass.shared';
import type { GatepassWithProfile, UserRole } from '../../../types';

export const getGatepasses = async (userId: string, role: UserRole): Promise<GatepassWithProfile[]> => {
  const visibility = buildVisibilityClause(role, userId, 1);
  const conditions = visibility.clause ? [visibility.clause] : [];
  return runGatepassQuery(getDb(), conditions, visibility.params);
};
