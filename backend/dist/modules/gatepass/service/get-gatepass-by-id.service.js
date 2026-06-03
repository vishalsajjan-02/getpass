"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGatepassById = void 0;
const database_1 = require("../../../config/database");
const gatepass_shared_1 = require("./shared/gatepass.shared");
const getGatepassById = async (id, actorUserId, actorRole) => {
    const gatepasses = await (0, gatepass_shared_1.runGatepassQuery)((0, database_1.getDb)(), [
        'g.id = $1',
        ...((0, gatepass_shared_1.buildVisibilityClause)(actorRole, actorUserId, 2).clause
            ? [(0, gatepass_shared_1.buildVisibilityClause)(actorRole, actorUserId, 2).clause]
            : []),
    ], [
        id,
        ...(0, gatepass_shared_1.buildVisibilityClause)(actorRole, actorUserId, 2).params,
    ]);
    const gatepass = gatepasses[0];
    if (!gatepass)
        throw new Error('Gatepass not found');
    return gatepass;
};
exports.getGatepassById = getGatepassById;
//# sourceMappingURL=get-gatepass-by-id.service.js.map