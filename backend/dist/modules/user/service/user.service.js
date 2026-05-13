"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getRoles = exports.getAllUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const database_1 = require("../../../config/database");
const SALT_ROUNDS = 10;
const PUBLIC_COLS = 'id,name,email,role,department,employee_id,phone,address,created_at,updated_at';
const getAllUsers = async () => {
    const result = await (0, database_1.getDb)().query(`SELECT ${PUBLIC_COLS} FROM users ORDER BY role, name`);
    return result.rows;
};
exports.getAllUsers = getAllUsers;
const getRoles = async () => {
    const result = await (0, database_1.getDb)().query('SELECT name FROM roles ORDER BY CASE name WHEN \'admin\' THEN 1 WHEN \'manager\' THEN 2 WHEN \'gatekeeper\' THEN 3 WHEN \'employee\' THEN 4 WHEN \'guest\' THEN 5 ELSE 6 END');
    return result.rows;
};
exports.getRoles = getRoles;
const getUserById = async (id) => {
    const result = await (0, database_1.getDb)().query(`SELECT ${PUBLIC_COLS} FROM users WHERE id = $1`, [id]);
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
    const roleExists = await pool.query('SELECT 1 FROM roles WHERE name = $1', [input.role]);
    if (!roleExists.rows[0])
        throw new Error('Invalid role');
    const id = (0, uuid_1.v4)();
    const hashed = await bcryptjs_1.default.hash(input.password, SALT_ROUNDS);
    await pool.query(`INSERT INTO users (id, name, email, password, role, department, employee_id, phone, address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [id, input.name, input.email, hashed, input.role,
        input.department ?? null, input.employee_id ?? null,
        input.phone ?? null, input.address ?? null]);
    return (0, exports.getUserById)(id);
};
exports.createUser = createUser;
const updateUser = async (id, input) => {
    const pool = (0, database_1.getDb)();
    await (0, exports.getUserById)(id);
    if (input.role) {
        const roleExists = await pool.query('SELECT 1 FROM roles WHERE name = $1', [input.role]);
        if (!roleExists.rows[0])
            throw new Error('Invalid role');
    }
    const entries = Object.entries(input).filter(([, v]) => v !== undefined);
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