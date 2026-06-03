"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailyLunchReport = void 0;
const get_daily_lunch_report_service_1 = require("../service/get-daily-lunch-report.service");
const response_utils_1 = require("../../../utils/response.utils");
const getDailyLunchReport = async (req, res) => {
    try {
        const date = typeof req.query.date === 'string' ? req.query.date : undefined;
        const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
        (0, response_utils_1.sendSuccess)(res, await (0, get_daily_lunch_report_service_1.getDailyLunchReport)(date, employeeId));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getDailyLunchReport = getDailyLunchReport;
//# sourceMappingURL=get-daily-lunch-report.controller.js.map