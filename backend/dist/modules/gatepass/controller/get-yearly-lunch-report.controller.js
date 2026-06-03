"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getYearlyLunchReport = void 0;
const get_yearly_lunch_report_service_1 = require("../service/get-yearly-lunch-report.service");
const response_utils_1 = require("../../../utils/response.utils");
const getYearlyLunchReport = async (req, res) => {
    try {
        const year = typeof req.query.year === 'string' ? req.query.year : undefined;
        const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
        (0, response_utils_1.sendSuccess)(res, await (0, get_yearly_lunch_report_service_1.getYearlyLunchReport)(year, employeeId));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getYearlyLunchReport = getYearlyLunchReport;
//# sourceMappingURL=get-yearly-lunch-report.controller.js.map