"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLunchAnalyticsRangeReport = void 0;
const gatepass_shared_1 = require("./shared/gatepass.shared");
const getLunchAnalyticsRangeReport = async (startDateParam, endDateParam, employeeId) => {
    const { startDate, endDate } = (0, gatepass_shared_1.normalizeDateRange)(startDateParam, endDateParam);
    return (0, gatepass_shared_1.buildLunchAnalyticsRangeReport)(startDate, endDate, employeeId);
};
exports.getLunchAnalyticsRangeReport = getLunchAnalyticsRangeReport;
//# sourceMappingURL=get-lunch-analytics-range-report.service.js.map