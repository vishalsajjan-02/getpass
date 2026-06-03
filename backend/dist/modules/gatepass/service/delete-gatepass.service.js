"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGatepass = void 0;
const database_1 = require("../../../config/database");
const gatepass_shared_1 = require("./shared/gatepass.shared");
const deleteGatepass = async (id, actorUserId, actorRole) => {
    const gatepass = await (0, gatepass_shared_1.getGatepassByIdInternal)((0, database_1.getDb)(), id);
    if (actorRole !== 'admin' && gatepass.user_id !== actorUserId) {
        throw new Error('You are not allowed to delete this gatepass');
    }
    await (0, database_1.getDb)().query('DELETE FROM gatepasses WHERE id = $1', [id]);
};
exports.deleteGatepass = deleteGatepass;
//# sourceMappingURL=delete-gatepass.service.js.map