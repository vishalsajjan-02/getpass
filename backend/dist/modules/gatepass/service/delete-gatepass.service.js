"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGatepass = void 0;
const database_1 = require("../../../config/database");
const gatepass_shared_1 = require("./shared/gatepass.shared");
const soft_delete_1 = require("../../../utils/soft-delete");
const deleteGatepass = async (id, actorUserId, actorRole) => {
    const gatepass = await (0, gatepass_shared_1.getGatepassByIdInternal)((0, database_1.getDb)(), id);
    if (actorRole !== 'admin' && gatepass.user_id !== actorUserId) {
        throw new Error('You are not allowed to delete this gatepass');
    }
    const deleted = await (0, soft_delete_1.softDeleteById)('gatepasses', id);
    if (!deleted)
        throw new Error('Gatepass not found or already deleted');
    await (0, database_1.getDb)().query(`UPDATE gatepass_approval_requests
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE gatepass_id = $1 AND deleted_at IS NULL`, [id]);
};
exports.deleteGatepass = deleteGatepass;
//# sourceMappingURL=delete-gatepass.service.js.map