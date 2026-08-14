"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkImportUsers = void 0;
const create_user_service_1 = require("./create-user.service");
const user_shared_1 = require("./shared/user.shared");
const parseLeaveBalance = (value) => {
    if (value === undefined || value === null || value === '')
        return undefined;
    const parsed = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(parsed)) {
        throw new Error('leave_balance must be a number');
    }
    return Math.round(parsed * 100) / 100;
};
const bulkImportUsers = async (rows) => {
    const result = { created: 0, failed: 0, errors: [] };
    for (const row of rows) {
        const email = row.email?.trim().toLowerCase();
        const name = row.name?.trim();
        const password = row.password?.trim();
        const role = row.role?.trim().toLowerCase();
        if (!name || !email || !password || !role) {
            result.failed += 1;
            result.errors.push({
                email: email || row.email || 'unknown',
                message: 'name, email, password, and role are required',
            });
            continue;
        }
        try {
            const department_id = await (0, user_shared_1.resolveDepartmentId)(row.department);
            const manager_id = role === 'employee' ? await (0, user_shared_1.resolveManagerId)(row.manager_email) : null;
            if (role === 'employee' && row.manager_email?.trim() && !manager_id) {
                throw new Error(`Manager not found for email: ${row.manager_email}`);
            }
            const leave_balance = parseLeaveBalance(row.leave_balance);
            await (0, create_user_service_1.createUser)({
                name,
                email,
                password,
                role,
                department_id: department_id ?? undefined,
                manager_id: manager_id ?? undefined,
                employee_id: row.employee_id?.trim() || undefined,
                leave_balance,
            });
            result.created += 1;
        }
        catch (err) {
            result.failed += 1;
            result.errors.push({
                email,
                message: err.message,
            });
        }
    }
    return result;
};
exports.bulkImportUsers = bulkImportUsers;
//# sourceMappingURL=bulk-import-users.service.js.map