"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailyLunchReport = void 0;
const gatepass_shared_1 = require("./shared/gatepass.shared");
const getDailyLunchReport = async (dateParam, employeeId) => {
    const date = (0, gatepass_shared_1.parseDateParam)(dateParam, new Date());
    const rangeReport = await (0, gatepass_shared_1.buildLunchAnalyticsRangeReport)(date, date, employeeId);
    return {
        date,
        allowed_lunch_minutes: rangeReport.allowed_lunch_minutes,
        employees: rangeReport.employees,
        total_violations: rangeReport.total_violations,
    };
};
exports.getDailyLunchReport = getDailyLunchReport;
//# sourceMappingURL=get-daily-lunch-report.service.js.map