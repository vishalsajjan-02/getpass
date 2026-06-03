"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginWithCredentials = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../../../config/database");
const jwt_utils_1 = require("../../../utils/jwt.utils");
const auth_shared_1 = require("./shared/auth.shared");
const loginWithCredentials = async (email, password) => {
    const result = await (0, database_1.getDb)().query(`${auth_shared_1.USER_WITH_PASSWORD_SELECT} WHERE u.email = $1`, [email]);
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
//# sourceMappingURL=login.service.js.map