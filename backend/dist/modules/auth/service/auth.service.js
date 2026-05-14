"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.guestLogin = exports.loginWithCredentials = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../../../config/database");
const jwt_utils_1 = require("../../../utils/jwt.utils");
const env_1 = require("../../../config/env");
const USER_SELECT = `
  SELECT u.id, u.name, u.email, r.name AS role, u.role_id,
         d.name AS department, u.department_id,
         u.manager_id, u.created_at, u.updated_at
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN departments d ON d.id = u.department_id
`;
const USER_WITH_PASSWORD_SELECT = `
  SELECT u.id, u.name, u.email, u.password, r.name AS role, u.role_id,
         d.name AS department, u.department_id,
         u.manager_id, u.created_at, u.updated_at
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN departments d ON d.id = u.department_id
`;
const loginWithCredentials = async (email, password) => {
    const pool = (0, database_1.getDb)();
    const result = await pool.query(`${USER_WITH_PASSWORD_SELECT} WHERE u.email = $1`, [email]);
    const row = result.rows[0];
    if (!row)
        throw new Error('Invalid email or password');
    const valid = await bcryptjs_1.default.compare(password, row.password);
    if (!valid)
        throw new Error('Invalid email or password');
    const { password: _pw, ...user } = row;
    const token = (0, jwt_utils_1.signToken)({ userId: user.id, email: user.email, role: user.role });
    return { token, user: user };
};
exports.loginWithCredentials = loginWithCredentials;
const guestLogin = async (code) => {
    if (!env_1.env.GUEST_CODES.includes(code)) {
        throw new Error('Invalid guest code');
    }
    const pool = (0, database_1.getDb)();
    const result = await pool.query(`${USER_SELECT} WHERE r.name = 'guest' LIMIT 1`);
    const row = result.rows[0];
    if (!row)
        throw new Error('No guest account configured. Run seed first.');
    const token = (0, jwt_utils_1.signToken)({ userId: row.id, email: row.email, role: row.role });
    return { token, user: row };
};
exports.guestLogin = guestLogin;
const getMe = async (userId) => {
    const pool = (0, database_1.getDb)();
    const result = await pool.query(`${USER_SELECT} WHERE u.id = $1`, [userId]);
    const row = result.rows[0];
    if (!row)
        throw new Error('User not found');
    return row;
};
exports.getMe = getMe;
//# sourceMappingURL=auth.service.js.map