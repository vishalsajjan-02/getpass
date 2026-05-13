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
const loginWithCredentials = async (email, password) => {
    const pool = (0, database_1.getDb)();
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
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
    const result = await pool.query("SELECT * FROM users WHERE role = 'guest' LIMIT 1");
    const row = result.rows[0];
    if (!row)
        throw new Error('No guest account configured. Run seed first.');
    const { password: _pw, ...user } = row;
    const token = (0, jwt_utils_1.signToken)({ userId: user.id, email: user.email, role: user.role });
    return { token, user: user };
};
exports.guestLogin = guestLogin;
const getMe = async (userId) => {
    const pool = (0, database_1.getDb)();
    const result = await pool.query('SELECT id,name,email,role,department,employee_id,phone,address,created_at,updated_at FROM users WHERE id = $1', [userId]);
    const row = result.rows[0];
    if (!row)
        throw new Error('User not found');
    return row;
};
exports.getMe = getMe;
//# sourceMappingURL=auth.service.js.map