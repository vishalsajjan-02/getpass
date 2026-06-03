"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchGatepasses = void 0;
const database_1 = require("../../../config/database");
const gatepass_shared_1 = require("./shared/gatepass.shared");
const searchGatepasses = async (query, userId, role) => {
    const like = `%${query.trim()}%`;
    const conditions = [
        `(gr.name ILIKE $1
      OR COALESCE(g.reason_description, '') ILIKE $2
      OR COALESCE(g.destination, '') ILIKE $3
      OR COALESCE(u.name, '') ILIKE $4
      OR g.id::text ILIKE $5)`,
    ];
    const params = [like, like, like, like, like];
    const visibility = (0, gatepass_shared_1.buildVisibilityClause)(role, userId, params.length + 1);
    if (visibility.clause) {
        conditions.push(visibility.clause);
        params.push(...visibility.params);
    }
    return (0, gatepass_shared_1.runGatepassQuery)((0, database_1.getDb)(), conditions, params);
};
exports.searchGatepasses = searchGatepasses;
//# sourceMappingURL=search-gatepasses.service.js.map