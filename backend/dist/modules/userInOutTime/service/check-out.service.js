"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOut = void 0;
const database_1 = require("../../../config/database");
const user_in_out_time_shared_1 = require("./shared/user-in-out-time.shared");
const checkOut = async (userId) => {
    await (0, user_in_out_time_shared_1.ensureUserExists)(userId);
    const date = (0, user_in_out_time_shared_1.todayDate)();
    const result = await (0, database_1.getDb)().query(`
    INSERT INTO user_in_out_time (user_id, date, out_time)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      out_time   = NOW(),
      updated_at = NOW()
    RETURNING id, user_id, date, in_time, out_time, created_at, updated_at
    `, [userId, date]);
    return result.rows[0];
};
exports.checkOut = checkOut;
//# sourceMappingURL=check-out.service.js.map