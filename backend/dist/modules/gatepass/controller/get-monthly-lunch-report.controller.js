"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMonthlyLunchReport = void 0;
const get_monthly_lunch_report_service_1 = require("../service/get-monthly-lunch-report.service");
const response_utils_1 = require("../../../utils/response.utils");
const getMonthlyLunchReport = async (req, res) => {
    try {
        const month = typeof req.query.month === 'string' ? req.query.month : undefined;
        const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
        (0, response_utils_1.sendSuccess)(res, await (0, get_monthly_lunch_report_service_1.getMonthlyLunchReport)(month, employeeId));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getMonthlyLunchReport = getMonthlyLunchReport;
//# sourceMappingURL=get-monthly-lunch-report.controller.js.map