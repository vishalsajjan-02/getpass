"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getManagers = void 0;
const database_1 = require("../../../config/database");
const getManagers = async () => {
    const result = await (0, database_1.getDb)().query(`SELECT u.id, u.name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'manager'
     ORDER BY u.name`);
    return result.rows;
};
exports.getManagers = getManagers;
//# sourceMappingURL=get-managers.service.js.map