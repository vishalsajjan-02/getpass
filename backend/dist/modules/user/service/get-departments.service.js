"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDepartments = void 0;
const database_1 = require("../../../config/database");
const getDepartments = async () => {
    const result = await (0, database_1.getDb)().query(`SELECT id AS department_id, name FROM departments WHERE deleted_at IS NULL ORDER BY name`);
    return result.rows;
};
exports.getDepartments = getDepartments;
//# sourceMappingURL=get-departments.service.js.map