"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../../../config/database");
const user_shared_1 = require("./shared/user.shared");
const updateUser = async (id, input) => {
    const pool = (0, database_1.getDb)();
    await (0, user_shared_1.getUserById)(id);
    const extra = {};
    if (input.role) {
        const roleRow = await pool.query('SELECT id AS role_id FROM roles WHERE name = $1', [input.role]);
        if (!roleRow.rows[0])
            throw new Error('Invalid role');
        extra.role_id = roleRow.rows[0].role_id;
    }
    if (input.password) {
        extra.password = await bcryptjs_1.default.hash(input.password, user_shared_1.SALT_ROUNDS);
    }
    const { password: _pw, ...inputWithoutPassword } = input;
    const merged = { ...inputWithoutPassword, ...extra };
    const entries = Object.entries(merged).filter(([, v]) => v !== undefined);
    if (!entries.length)
        return (0, user_shared_1.getUserById)(id);
    const fields = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = [...entries.map(([, v]) => v), id];
    await pool.query(`UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $${values.length}`, values);
    return (0, user_shared_1.getUserById)(id);
};
exports.updateUser = updateUser;
//# sourceMappingURL=update-user.service.js.map