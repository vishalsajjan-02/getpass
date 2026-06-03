import { getDb } from '../../../config/database';
import { buildVisibilityClause, runGatepassQuery } from './shared/gatepass.shared';
import type { GatepassWithProfile, UserRole } from '../../../types';

export const searchGatepasses = async (
  query: string,
  userId: string,
  role: UserRole,
): Promise<GatepassWithProfile[]> => {
  const like = `%${query.trim()}%`;
  const conditions = [
    `(gr.name ILIKE $1
      OR COALESCE(g.reason_description, '') ILIKE $2
      OR COALESCE(g.destination, '') ILIKE $3
      OR COALESCE(u.name, '') ILIKE $4
      OR g.id::text ILIKE $5)`,
  ];
  const params: unknown[] = [like, like, like, like, like];
  const visibility = buildVisibilityClause(role, userId, params.length + 1);

  if (visibility.clause) {
    conditions.push(visibility.clause);
    params.push(...visibility.params);
  }

  return runGatepassQuery(getDb(), conditions, params);
};
