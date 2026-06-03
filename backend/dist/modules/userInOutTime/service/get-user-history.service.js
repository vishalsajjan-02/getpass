"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserHistory = void 0;
const database_1 = require("../../../config/database");
const user_in_out_time_shared_1 = require("./shared/user-in-out-time.shared");
const getUserHistory = async (userId, fromDate, toDate) => {
    await (0, user_in_out_time_shared_1.ensureUserExists)(userId);
    const conditions = ['user_id = $1'];
    const params = [userId];
    if (fromDate) {
        if (!(0, user_in_out_time_shared_1.isValidDate)(fromDate))
            throw new Error('Invalid fromDate. Use YYYY-MM-DD');
        params.push(fromDate);
        conditions.push(`date >= $${params.length}::date`);
    }
    if (toDate) {
        if (!(0, user_in_out_time_shared_1.isValidDate)(toDate))
            throw new Error('Invalid toDate. Use YYYY-MM-DD');
        params.push(toDate);
        conditions.push(`date <= $${params.length}::date`);
    }
    const result = await (0, database_1.getDb)().query(`
    SELECT id, user_id, date, in_time, out_time, created_at, updated_at
    FROM user_in_out_time
    WHERE ${conditions.join(' AND ')}
    ORDER BY date DESC
    `, params);
    return result.rows;
};
exports.getUserHistory = getUserHistory;
//# sourceMappingURL=get-user-history.service.js.map