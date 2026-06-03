"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLunchAnalyticsRangeReport = void 0;
const get_lunch_analytics_range_report_service_1 = require("../service/get-lunch-analytics-range-report.service");
const response_utils_1 = require("../../../utils/response.utils");
const getLunchAnalyticsRangeReport = async (req, res) => {
    try {
        const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
        const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
        const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
        (0, response_utils_1.sendSuccess)(res, await (0, get_lunch_analytics_range_report_service_1.getLunchAnalyticsRangeReport)(startDate, endDate, employeeId));
    }
    catch (err) {
        (0, response_utils_1.sendError)(res, err.message, 500);
    }
};
exports.getLunchAnalyticsRangeReport = getLunchAnalyticsRangeReport;
//# sourceMappingURL=get-lunch-analytics-range-report.controller.js.map