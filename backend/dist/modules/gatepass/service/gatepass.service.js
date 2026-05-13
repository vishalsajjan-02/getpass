"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGatepass = exports.updateGatepassStatus = exports.createGatepass = exports.getGatepassStats = exports.getGatepassById = exports.searchGatepasses = exports.getTodaysGatepasses = exports.getGatepasses = exports.getGatepassReasons = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../../../config/database");
const rowToGatepass = (row) => ({
    ...row,
    is_emergency: Boolean(row.is_emergency),
});
const withProfile = (row) => ({
    ...rowToGatepass(row),
    profiles: row.profile_name
        ? {
            name: row.profile_name,
            email: row.profile_email,
            department: row.profile_department || undefined,
            employee_id: row.profile_employee_id || undefined,
        }
        : undefined,
});
const BASE_QUERY = `
  SELECT g.*,
         u.name  AS profile_name,
         u.email AS profile_email,
         u.department  AS profile_department,
         u.employee_id AS profile_employee_id
  FROM gatepasses g
  LEFT JOIN users u ON g.user_id = u.id
`;
const getGatepassReasons = async () => {
    const result = await (0, database_1.getDb)().query('SELECT name FROM gatepass_reasons ORDER BY created_at, name');
    return result.rows;
};
exports.getGatepassReasons = getGatepassReasons;
const getGatepasses = async (userId, role) => {
    const pool = (0, database_1.getDb)();
    let sql = BASE_QUERY;
    const params = [];
    if (role === 'employee' || role === 'guest') {
        sql += ' WHERE g.user_id = $1';
        params.push(userId);
    }
    else if (role === 'gatekeeper') {
        sql += " WHERE g.status IN ('approved','active','completed')";
    }
    sql += ' ORDER BY g.created_at DESC';
    const result = await pool.query(sql, params);
    return result.rows.map(withProfile);
};
exports.getGatepasses = getGatepasses;
const getTodaysGatepasses = async (userId, role) => {
    const pool = (0, database_1.getDb)();
    const today = new Date().toISOString().split('T')[0];
    let sql = `${BASE_QUERY} WHERE g.date = $1`;
    const params = [today];
    if (role === 'employee' || role === 'guest') {
        sql += ' AND g.user_id = $2';
        params.push(userId);
    }
    else if (role === 'gatekeeper') {
        sql += " AND g.status IN ('approved','active','completed')";
    }
    sql += ' ORDER BY g.created_at DESC';
    const result = await pool.query(sql, params);
    return result.rows.map(withProfile);
};
exports.getTodaysGatepasses = getTodaysGatepasses;
const searchGatepasses = async (query, userId, role) => {
    const pool = (0, database_1.getDb)();
    const like = `%${query}%`;
    let sql = `${BASE_QUERY} WHERE (g.purpose ILIKE $1 OR g.destination ILIKE $2 OR u.name ILIKE $3 OR g.gatepass_id ILIKE $4)`;
    const params = [like, like, like, like];
    if (role === 'employee' || role === 'guest') {
        sql += ` AND g.user_id = $${params.length + 1}`;
        params.push(userId);
    }
    else if (role === 'gatekeeper') {
        sql += " AND g.status IN ('approved','active','completed')";
    }
    sql += ' ORDER BY g.created_at DESC';
    const result = await pool.query(sql, params);
    return result.rows.map(withProfile);
};
exports.searchGatepasses = searchGatepasses;
const getGatepassById = async (id) => {
    const pool = (0, database_1.getDb)();
    const result = await pool.query(`${BASE_QUERY} WHERE g.id = $1`, [id]);
    const row = result.rows[0];
    if (!row)
        throw new Error('Gatepass not found');
    return withProfile(row);
};
exports.getGatepassById = getGatepassById;
const getGatepassStats = async (userId) => {
    const pool = (0, database_1.getDb)();
    let sql = 'SELECT status, COUNT(*) as count FROM gatepasses';
    const params = [];
    if (userId) {
        sql += ' WHERE user_id = $1';
        params.push(userId);
    }
    sql += ' GROUP BY status';
    const result = await pool.query(sql, params);
    const stats = { total: 0, pending: 0, approved: 0, rejected: 0, active: 0, completed: 0 };
    for (const { status, count } of result.rows) {
        const n = parseInt(count, 10);
        switch (status) {
            case 'pending':
                stats.pending = n;
                break;
            case 'approved':
                stats.approved = n;
                break;
            case 'rejected':
                stats.rejected = n;
                break;
            case 'active':
                stats.active = n;
                break;
            case 'completed':
                stats.completed = n;
                break;
        }
        stats.total += n;
    }
    return stats;
};
exports.getGatepassStats = getGatepassStats;
const generateGatepassId = () => {
    const d = new Date();
    const dateStr = d.toISOString().slice(2, 10).replace(/-/g, '');
    const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    return `GP${dateStr}${seq}`;
};
const createGatepass = async (userId, input) => {
    const pool = (0, database_1.getDb)();
    const id = (0, uuid_1.v4)();
    const gatepassId = generateGatepassId();
    const now = new Date();
    const date = input.date ?? now.toISOString().split('T')[0];
    const outTime = input.out_time ?? now.toTimeString().slice(0, 5);
    await pool.query(`INSERT INTO gatepasses
       (id, gatepass_id, user_id, purpose, destination, date, out_time, expected_return_time, is_emergency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
        id,
        gatepassId,
        userId,
        input.purpose,
        input.destination ?? null,
        date,
        outTime,
        input.expected_return_time ?? null,
        input.is_emergency ?? false,
    ]);
    return (0, exports.getGatepassById)(id);
};
exports.createGatepass = createGatepass;
const updateGatepassStatus = async (id, input) => {
    const pool = (0, database_1.getDb)();
    await (0, exports.getGatepassById)(id);
    const updates = {
        status: input.status,
        updated_at: new Date().toISOString(),
    };
    if (input.approved_by) {
        updates.approved_by = input.approved_by;
        updates.approved_at = new Date().toISOString();
    }
    if (input.rejection_reason)
        updates.rejection_reason = input.rejection_reason;
    if (input.out_time)
        updates.out_time = input.out_time;
    if (input.actual_return_time)
        updates.actual_return_time = input.actual_return_time;
    const entries = Object.entries(updates);
    const setClauses = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = [...entries.map(([, v]) => v), id];
    await pool.query(`UPDATE gatepasses SET ${setClauses} WHERE id = $${values.length}`, values);
    return (0, exports.getGatepassById)(id);
};
exports.updateGatepassStatus = updateGatepassStatus;
const deleteGatepass = async (id) => {
    const pool = (0, database_1.getDb)();
    await (0, exports.getGatepassById)(id);
    await pool.query('DELETE FROM gatepasses WHERE id = $1', [id]);
};
exports.deleteGatepass = deleteGatepass;
//# sourceMappingURL=gatepass.service.js.map