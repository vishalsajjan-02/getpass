"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = void 0;
const database_1 = require("../../../config/database");
const user_shared_1 = require("./shared/user.shared");
const getAllUsers = async () => {
    const result = await (0, database_1.getDb)().query(`${user_shared_1.USER_SELECT} ORDER BY r.name, u.name`);
    return result.rows;
};
exports.getAllUsers = getAllUsers;
//# sourceMappingURL=get-all-users.service.js.map