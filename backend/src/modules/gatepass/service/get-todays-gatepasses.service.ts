import { getDb } from '../../../config/database';
import { buildVisibilityClause, runGatepassQuery } from './shared/gatepass.shared';
import type { GatepassWithProfile, UserRole } from '../../../types';

export const getTodaysGatepasses = async (userId: string, role: UserRole): Promise<GatepassWithProfile[]> => {
  const today = new Date().toISOString().slice(0, 10);
  const conditions = ['g.date = $1'];
  const params: unknown[] = [today];
  const visibility = buildVisibilityClause(role, userId, params.length + 1);

  if (visibility.clause) {
    conditions.push(visibility.clause);
    params.push(...visibility.params);
  }

  return runGatepassQuery(getDb(), conditions, params);
};
