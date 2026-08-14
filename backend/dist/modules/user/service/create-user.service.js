"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../../../config/database");
const user_shared_1 = require("./shared/user.shared");
const leave_balance_shared_1 = require("../../leave/service/shared/leave-balance.shared");
const createUser = async (input) => {
    const pool = (0, database_1.getDb)();
    const existing = await pool.query('SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [input.email]);
    if (existing.rows[0])
        throw new Error('Email already in use');
    const roleRow = await pool.query('SELECT id AS role_id FROM roles WHERE name = $1 AND deleted_at IS NULL', [input.role]);
    if (!roleRow.rows[0])
        throw new Error('Invalid role');
    const roleId = roleRow.rows[0].role_id;
    const hashed = await bcryptjs_1.default.hash(input.password, user_shared_1.SALT_ROUNDS);
    const defaults = (0, leave_balance_shared_1.initialLeaveBalanceForNewUser)();
    const leaveBalance = typeof input.leave_balance === 'number' && Number.isFinite(input.leave_balance)
        ? Math.round(input.leave_balance * 100) / 100
        : defaults.leave_balance;
    const employeeId = (0, user_shared_1.normalizeEmployeeId)(input.employee_id);
    await (0, user_shared_1.assertEmployeeIdAvailable)(employeeId);
    const inserted = await pool.query(`INSERT INTO users
       (name, email, password, role_id, department_id, manager_id, leave_balance, leave_accrued_through, employee_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`, [
        input.name,
        input.email,
        hashed,
        roleId,
        input.department_id ?? null,
        input.manager_id ?? null,
        leaveBalance,
        (0, leave_balance_shared_1.currentMonthKey)(),
        employeeId,
    ]);
    return (0, user_shared_1.getUserById)(inserted.rows[0].id);
};
exports.createUser = createUser;
//# sourceMappingURL=create-user.service.js.map