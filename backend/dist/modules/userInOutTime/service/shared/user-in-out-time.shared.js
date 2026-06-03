"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUserExists = exports.resolveDate = exports.todayDate = exports.isValidDate = void 0;
const database_1 = require("../../../../config/database");
const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
exports.isValidDate = isValidDate;
const todayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
exports.todayDate = todayDate;
const resolveDate = (date) => {
    if (!date)
        return (0, exports.todayDate)();
    if (!(0, exports.isValidDate)(date))
        throw new Error('Invalid date. Use YYYY-MM-DD');
    return date;
};
exports.resolveDate = resolveDate;
const ensureUserExists = async (userId) => {
    const existing = await (0, database_1.getDb)().query('SELECT id FROM users WHERE id = $1', [userId]);
    if (!existing.rows[0])
        throw new Error('User not found');
};
exports.ensureUserExists = ensureUserExists;
//# sourceMappingURL=user-in-out-time.shared.js.map