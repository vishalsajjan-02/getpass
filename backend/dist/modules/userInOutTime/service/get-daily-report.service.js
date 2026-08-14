"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailyReport = void 0;
const database_1 = require("../../../config/database");
const uploads_1 = require("../../../utils/uploads");
const user_in_out_time_shared_1 = require("./shared/user-in-out-time.shared");
const getDailyReport = async (date) => {
    const targetDate = (0, user_in_out_time_shared_1.resolveDate)(date);
    const today = (0, user_in_out_time_shared_1.todayDate)();
    const holidayDates = await (0, user_in_out_time_shared_1.loadCompanyHolidayDates)((0, database_1.getDb)(), targetDate, targetDate);
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
      t.in_photo_path       AS in_photo_path,
      t.out_photo_path      AS out_photo_path,
      t.in_location         AS in_location,
      t.out_location        AS out_location,
      t.in_latitude         AS in_latitude,
      t.in_longitude        AS in_longitude,
      t.out_latitude        AS out_latitude,
      t.out_longitude       AS out_longitude,
      t.in_via              AS in_via,
      t.out_via             AS out_via,
      t.in_marked_by        AS in_marked_by,
      t.out_marked_by       AS out_marked_by,
      (u.face_image_path IS NOT NULL) AS has_face,
      t.updated_at          AS updated_at
    FROM users u
    JOIN roles r            ON r.id = u.role_id AND r.deleted_at IS NULL
    LEFT JOIN departments d ON d.id = u.department_id AND d.deleted_at IS NULL
    LEFT JOIN user_in_out_time t
      ON t.user_id = u.id AND t.date = $1::date AND t.deleted_at IS NULL
    WHERE r.name <> 'guest'
      AND u.deleted_at IS NULL
      AND (u.created_at::date) <= $1::date
    ORDER BY r.name, u.name
    `, [targetDate]);
    return result.rows.map((row) => ({
        ...row,
        // Always return YYYY-MM-DD — node-pg Date objects serialize as ISO timestamps.
        date: targetDate,
        has_face: Boolean(row.has_face),
        in_photo_url: (0, uploads_1.publicUploadUrl)(row.in_photo_path ? String(row.in_photo_path) : null),
        out_photo_url: (0, uploads_1.publicUploadUrl)(row.out_photo_path ? String(row.out_photo_path) : null),
        in_location: row.in_location ? String(row.in_location) : undefined,
        out_location: row.out_location ? String(row.out_location) : undefined,
        in_latitude: row.in_latitude != null ? Number(row.in_latitude) : undefined,
        in_longitude: row.in_longitude != null ? Number(row.in_longitude) : undefined,
        out_latitude: row.out_latitude != null ? Number(row.out_latitude) : undefined,
        out_longitude: row.out_longitude != null ? Number(row.out_longitude) : undefined,
        in_via: row.in_via === 'self' || row.in_via === 'gatekeeper'
            ? row.in_via
            : undefined,
        out_via: row.out_via === 'self' || row.out_via === 'gatekeeper'
            ? row.out_via
            : undefined,
        in_marked_by: row.in_marked_by ? String(row.in_marked_by) : undefined,
        out_marked_by: row.out_marked_by ? String(row.out_marked_by) : undefined,
        day_status: (0, user_in_out_time_shared_1.resolveReportingDayStatus)(row.in_time, row.out_time, targetDate, today, holidayDates),
    }));
};
exports.getDailyReport = getDailyReport;
//# sourceMappingURL=get-daily-report.service.js.map