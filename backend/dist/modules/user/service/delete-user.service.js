"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = void 0;
const database_1 = require("../../../config/database");
const user_shared_1 = require("./shared/user.shared");
const deleteUser = async (id) => {
    await (0, user_shared_1.getUserById)(id);
    await (0, database_1.getDb)().query('DELETE FROM users WHERE id = $1', [id]);
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=delete-user.service.js.map