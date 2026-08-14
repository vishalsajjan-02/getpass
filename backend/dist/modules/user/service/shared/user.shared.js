"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveManagerId = exports.resolveDepartmentId = exports.getUserById = exports.mapUserRow = exports.assertEmployeeIdAvailable = exports.normalizeEmployeeId = exports.USER_SELECT = exports.SALT_ROUNDS = void 0;
const database_1 = require("../../../../config/database");
exports.SALT_ROUNDS = 10;
exports.USER_SELECT = `
  SELECT u.id, u.name, u.email, u.employee_id, r.name AS role, u.role_id,
         d.name AS department, u.department_id,
         u.manager_id, u.leave_balance, u.can_self_punch,
         u.face_image_path, u.face_registered_at,
         u.created_at, u.updated_at
  FROM users u
  JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
  LEFT JOIN departments d ON d.id = u.department_id AND d.deleted_at IS NULL
`;
const normalizeEmployeeId = (value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};
exports.normalizeEmployeeId = normalizeEmployeeId;
const assertEmployeeIdAvailable = async (employeeId, excludeUserId) => {
    if (!employeeId)
        return;
    const params = [employeeId];
    let sql = 'SELECT id FROM users WHERE employee_id = $1 AND deleted_at IS NULL';
    if (excludeUserId) {
        params.push(excludeUserId);
        sql += ' AND id <> $2';
    }
    const dup = await (0, database_1.getDb)().query(sql, params);
    if (dup.rows[0])
        throw new Error('Employee ID already in use');
};
exports.assertEmployeeIdAvailable = assertEmployeeIdAvailable;
const mapUserRow = (row) => {
    const facePath = row.face_image_path ? String(row.face_image_path) : null;
    return {
        ...row,
        employee_id: row.employee_id === null || row.employee_id === undefined
            ? null
            : String(row.employee_id),
        leave_balance: row.leave_balance === null || row.leave_balance === undefined
            ? undefined
            : Number(row.leave_balance),
        can_self_punch: Boolean(row.can_self_punch),
        face_image_path: facePath,
        face_image_url: facePath ? `/uploads/${facePath}` : null,
        face_registered_at: row.face_registered_at ? String(row.face_registered_at) : null,
        has_face: Boolean(facePath),
    };
};
exports.mapUserRow = mapUserRow;
const getUserById = async (id) => {
    const result = await (0, database_1.getDb)().query(`${exports.USER_SELECT} WHERE u.id = $1 AND u.deleted_at IS NULL`, [id]);
    const row = result.rows[0];
    if (!row)
        throw new Error('User not found');
    return (0, exports.mapUserRow)(row);
};
exports.getUserById = getUserById;
const resolveDepartmentId = async (department) => {
    if (!department?.trim())
        return null;
    const pool = (0, database_1.getDb)();
    const byId = await pool.query('SELECT id FROM departments WHERE id::text = $1 AND deleted_at IS NULL', [department.trim()]);
    if (byId.rows[0]?.id)
        return byId.rows[0].id;
    const byName = await pool.query('SELECT id FROM departments WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL', [department.trim()]);
    return byName.rows[0]?.id ?? null;
};
exports.resolveDepartmentId = resolveDepartmentId;
const resolveManagerId = async (managerEmail) => {
    if (!managerEmail?.trim())
        return null;
    const result = await (0, database_1.getDb)().query(`SELECT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
     WHERE LOWER(u.email) = LOWER($1) AND r.name = 'manager' AND u.deleted_at IS NULL`, [managerEmail.trim()]);
    return result.rows[0]?.id ?? null;
};
exports.resolveManagerId = resolveManagerId;
//# sourceMappingURL=user.shared.js.map