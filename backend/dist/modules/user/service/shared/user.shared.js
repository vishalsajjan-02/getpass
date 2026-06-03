"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveManagerId = exports.resolveDepartmentId = exports.getUserById = exports.USER_SELECT = exports.SALT_ROUNDS = void 0;
const database_1 = require("../../../../config/database");
exports.SALT_ROUNDS = 10;
exports.USER_SELECT = `
  SELECT u.id, u.name, u.email, r.name AS role, u.role_id,
         d.name AS department, u.department_id,
         u.manager_id, u.created_at, u.updated_at
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN departments d ON d.id = u.department_id
`;
const getUserById = async (id) => {
    const result = await (0, database_1.getDb)().query(`${exports.USER_SELECT} WHERE u.id = $1`, [id]);
    const row = result.rows[0];
    if (!row)
        throw new Error('User not found');
    return row;
};
exports.getUserById = getUserById;
const resolveDepartmentId = async (department) => {
    if (!department?.trim())
        return null;
    const pool = (0, database_1.getDb)();
    const byId = await pool.query('SELECT id FROM departments WHERE id::text = $1', [department.trim()]);
    if (byId.rows[0]?.id)
        return byId.rows[0].id;
    const byName = await pool.query('SELECT id FROM departments WHERE LOWER(name) = LOWER($1)', [department.trim()]);
    return byName.rows[0]?.id ?? null;
};
exports.resolveDepartmentId = resolveDepartmentId;
const resolveManagerId = async (managerEmail) => {
    if (!managerEmail?.trim())
        return null;
    const result = await (0, database_1.getDb)().query(`SELECT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE LOWER(u.email) = LOWER($1) AND r.name = 'manager'`, [managerEmail.trim()]);
    return result.rows[0]?.id ?? null;
};
exports.resolveManagerId = resolveManagerId;
//# sourceMappingURL=user.shared.js.map