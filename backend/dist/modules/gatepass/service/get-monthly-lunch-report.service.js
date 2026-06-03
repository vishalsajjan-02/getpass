"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMonthlyLunchReport = void 0;
const gatepass_shared_1 = require("./shared/gatepass.shared");
const getMonthlyLunchReport = async (monthParam, employeeId) => {
    const { monthLabel, startDate, endDate } = (0, gatepass_shared_1.parseMonthParam)(monthParam);
    const rangeReport = await (0, gatepass_shared_1.buildLunchAnalyticsRangeReport)(startDate, endDate, employeeId);
    return {
        month: monthLabel,
        allowed_lunch_minutes: rangeReport.allowed_lunch_minutes,
        employees: rangeReport.employees,
        total_violations: rangeReport.total_violations,
        top_employees: rangeReport.top_employees,
    };
};
exports.getMonthlyLunchReport = getMonthlyLunchReport;
//# sourceMappingURL=get-monthly-lunch-report.service.js.map