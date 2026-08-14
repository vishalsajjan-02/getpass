"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGatepassStats = void 0;
const database_1 = require("../../../config/database");
const gatepass_shared_1 = require("./shared/gatepass.shared");
const getGatepassStats = async (userId, role) => {
    const visibility = (0, gatepass_shared_1.buildVisibilityClause)(role, userId, 1);
    const where = visibility.clause
        ? ` WHERE g.deleted_at IS NULL AND ${visibility.clause}`
        : ' WHERE g.deleted_at IS NULL';
    const result = await (0, database_1.getDb)().query(`SELECT g.status, COUNT(*)::int AS count
     FROM gatepasses g
     ${where}
     GROUP BY g.status`, visibility.params);
    const stats = {
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
        const status = row.status;
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
exports.getGatepassStats = getGatepassStats;
//# sourceMappingURL=get-gatepass-stats.service.js.map