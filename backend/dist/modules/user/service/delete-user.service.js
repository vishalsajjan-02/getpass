"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = void 0;
const database_1 = require("../../../config/database");
const user_shared_1 = require("./shared/user.shared");
const soft_delete_1 = require("../../../utils/soft-delete");
const deleteUser = async (id) => {
    await (0, user_shared_1.getUserById)(id);
    const deleted = await (0, soft_delete_1.softDeleteById)('users', id);
    if (!deleted)
        throw new Error('User not found or already deleted');
    // Soft-delete related day leaves and attendance rows for this user.
    await (0, database_1.getDb)().query(`UPDATE user_day_leaves
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE user_id = $1 AND deleted_at IS NULL`, [id]);
    await (0, database_1.getDb)().query(`UPDATE user_in_out_time
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE user_id = $1 AND deleted_at IS NULL`, [id]);
    await (0, database_1.getDb)().query(`UPDATE gatepasses
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE user_id = $1 AND deleted_at IS NULL`, [id]);
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=delete-user.service.js.map