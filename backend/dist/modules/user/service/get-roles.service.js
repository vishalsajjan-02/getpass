"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoles = void 0;
const database_1 = require("../../../config/database");
const getRoles = async () => {
    const result = await (0, database_1.getDb)().query(`SELECT id AS role_id, name FROM roles
     ORDER BY CASE name
       WHEN 'admin'      THEN 1
       WHEN 'manager'    THEN 2
       WHEN 'gatekeeper' THEN 3
       WHEN 'employee'   THEN 4
       WHEN 'guest'      THEN 5
       ELSE 6
     END`);
    return result.rows;
};
exports.getRoles = getRoles;
//# sourceMappingURL=get-roles.service.js.map