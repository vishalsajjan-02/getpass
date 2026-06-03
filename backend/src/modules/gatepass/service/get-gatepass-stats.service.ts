import { getDb } from '../../../config/database';
import { buildVisibilityClause } from './shared/gatepass.shared';
import type { GatepassStats, GatepassStatus, UserRole } from '../../../types';

export const getGatepassStats = async (userId: string, role: UserRole): Promise<GatepassStats> => {
  const visibility = buildVisibilityClause(role, userId, 1);
  const where = visibility.clause ? ` WHERE ${visibility.clause}` : '';
  const result = await getDb().query(
    `SELECT g.status, COUNT(*)::int AS count
     FROM gatepasses g
     ${where}
     GROUP BY g.status`,
    visibility.params,
  );

  const stats: GatepassStats = {
    total: 0,
    pending: 0,
    pending_manager_approval: 0,
    pending_admin_approval: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    active: 0,
    completed: 0,
  };

  for (const row of result.rows) {
    const status = row.status as GatepassStatus;
    const count = Number(row.count ?? 0);

    switch (status) {
      case 'pending':
        stats.pending += count;
        break;
      case 'pending_manager_approval':
        stats.pending_manager_approval = count;
        stats.pending += count;
        break;
      case 'pending_admin_approval':
        stats.pending_admin_approval = count;
        stats.pending += count;
        break;
      case 'approved':
        stats.approved = count;
        break;
      case 'rejected':
        stats.rejected = count;
        break;
      case 'cancelled':
        stats.cancelled = count;
        break;
      case 'active':
        stats.active = count;
        break;
      case 'completed':
        stats.completed = count;
        break;
    }

    stats.total += count;
  }

  return stats;
};
