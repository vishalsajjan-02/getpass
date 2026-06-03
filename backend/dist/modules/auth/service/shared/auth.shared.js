"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.USER_WITH_PASSWORD_SELECT = exports.USER_SELECT = void 0;
const database_1 = require("../../../../config/database");
exports.USER_SELECT = `
  SELECT u.id, u.name, u.email, r.name AS role, u.role_id,
         d.name AS department, u.department_id,
         u.manager_id, u.created_at, u.updated_at
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN departments d ON d.id = u.department_id
`;
exports.USER_WITH_PASSWORD_SELECT = `
  SELECT u.id, u.name, u.email, u.password, r.name AS role, u.role_id,
         d.name AS department, u.department_id,
         u.manager_id, u.created_at, u.updated_at
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN departments d ON d.id = u.department_id
`;
const getMe = async (userId) => {
    const result = await (0, database_1.getDb)().query(`${exports.USER_SELECT} WHERE u.id = $1`, [userId]);
    const row = result.rows[0];
    if (!row)
        throw new Error('User not found');
    return row;
};
exports.getMe = getMe;
//# sourceMappingURL=auth.shared.js.map