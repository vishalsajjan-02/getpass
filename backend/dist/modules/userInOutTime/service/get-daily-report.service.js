"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailyReport = void 0;
const database_1 = require("../../../config/database");
const user_in_out_time_shared_1 = require("./shared/user-in-out-time.shared");
const getDailyReport = async (date) => {
    const targetDate = (0, user_in_out_time_shared_1.resolveDate)(date);
    const result = await (0, database_1.getDb)().query(`
    SELECT
      u.id                  AS user_id,
      u.name                AS user_name,
      u.email               AS email,
      r.name                AS role,
      d.name                AS department,
      $1::date              AS date,
      t.id                  AS entry_id,
      t.in_time             AS in_time,
      t.out_time            AS out_time,
      t.updated_at          AS updated_at
    FROM users u
    JOIN roles r            ON r.id = u.role_id
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN user_in_out_time t
      ON t.user_id = u.id AND t.date = $1::date
    WHERE r.name <> 'admin'
    ORDER BY r.name, u.name
    `, [targetDate]);
    return result.rows;
};
exports.getDailyReport = getDailyReport;
//# sourceMappingURL=get-daily-report.service.js.map