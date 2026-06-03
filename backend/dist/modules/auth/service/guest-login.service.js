"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guestLogin = void 0;
const database_1 = require("../../../config/database");
const jwt_utils_1 = require("../../../utils/jwt.utils");
const env_1 = require("../../../config/env");
const auth_shared_1 = require("./shared/auth.shared");
const guestLogin = async (code) => {
    if (!env_1.env.GUEST_CODES.includes(code)) {
        throw new Error('Invalid guest code');
    }
    const result = await (0, database_1.getDb)().query(`${auth_shared_1.USER_SELECT} WHERE r.name = 'guest' LIMIT 1`);
    const row = result.rows[0];
    if (!row)
        throw new Error('No guest account configured. Run seed first.');
    const token = (0, jwt_utils_1.signToken)({ userId: row.id, email: row.email, role: row.role });
    return { token, user: row };
};
exports.guestLogin = guestLogin;
//# sourceMappingURL=guest-login.service.js.map