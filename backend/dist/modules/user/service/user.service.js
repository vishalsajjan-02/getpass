"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getRoles = exports.getManagers = exports.getDepartments = exports.getAllUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../../../config/database");
const SALT_ROUNDS = 10;
const USER_SELECT = `
  SELECT u.id, u.name, u.email, r.name AS role, u.role_id,
         d.name AS department, u.department_id,
         u.manager_id, u.created_at, u.updated_at
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN departments d ON d.id = u.department_id
`;
const getAllUsers = async () => {
    const result = await (0, database_1.getDb)().query(`${USER_SELECT} ORDER BY r.name, u.name`);
    return result.rows;
};
exports.getAllUsers = getAllUsers;
const getDepartments = async () => {
    const result = await (0, database_1.getDb)().query(`SELECT id AS department_id, name FROM departments ORDER BY name`);
    return result.rows;
};
exports.getDepartments = getDepartments;
const getManagers = async () => {
    const result = await (0, database_1.getDb)().query(`SELECT u.id, u.name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'manager'
     ORDER BY u.name`);
    return result.rows;
};
exports.getManagers = getManagers;
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
const getUserById = async (id) => {
    const result = await (0, database_1.getDb)().query(`${USER_SELECT} WHERE u.id = $1`, [id]);
    const row = result.rows[0];
    if (!row)
        throw new Error('User not found');
    return row;
};
exports.getUserById = getUserById;
const createUser = async (input) => {
    const pool = (0, database_1.getDb)();
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [input.email]);
    if (existing.rows[0])
        throw new Error('Email already in use');
    const roleRow = await pool.query('SELECT id AS role_id FROM roles WHERE name = $1', [input.role]);
    if (!roleRow.rows[0])
        throw new Error('Invalid role');
    const roleId = roleRow.rows[0].role_id;
    const hashed = await bcryptjs_1.default.hash(input.password, SALT_ROUNDS);
    const inserted = await pool.query(`INSERT INTO users
       (name, email, password, role_id, department_id, manager_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`, [input.name, input.email, hashed, roleId, input.department_id ?? null, input.manager_id ?? null]);
    return (0, exports.getUserById)(inserted.rows[0].id);
};
exports.createUser = createUser;
const updateUser = async (id, input) => {
    const pool = (0, database_1.getDb)();
    await (0, exports.getUserById)(id);
    const extra = {};
    if (input.role) {
        const roleRow = await pool.query('SELECT id AS role_id FROM roles WHERE name = $1', [input.role]);
        if (!roleRow.rows[0])
            throw new Error('Invalid role');
        extra.role_id = roleRow.rows[0].role_id;
    }
    if (input.password) {
        extra.password = await bcryptjs_1.default.hash(input.password, SALT_ROUNDS);
    }
    const { password: _pw, ...inputWithoutPassword } = input;
    const merged = { ...inputWithoutPassword, ...extra };
    const entries = Object.entries(merged).filter(([, v]) => v !== undefined);
    if (!entries.length)
        return (0, exports.getUserById)(id);
    const fields = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = [...entries.map(([, v]) => v), id];
    await pool.query(`UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $${values.length}`, values);
    return (0, exports.getUserById)(id);
};
exports.updateUser = updateUser;
const deleteUser = async (id) => {
    const pool = (0, database_1.getDb)();
    await (0, exports.getUserById)(id);
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=user.service.js.map