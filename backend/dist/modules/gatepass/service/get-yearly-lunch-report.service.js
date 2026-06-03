"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getYearlyLunchReport = void 0;
const database_1 = require("../../../config/database");
const gatepass_shared_1 = require("./shared/gatepass.shared");
const getYearlyLunchReport = async (yearParam, employeeId) => {
    const { year, startDate, endDate } = (0, gatepass_shared_1.parseYearParam)(yearParam);
    const liveStatuses = await (0, gatepass_shared_1.getLiveEmployeeStatusesInternal)((0, database_1.getDb)(), employeeId);
    const entries = await (0, gatepass_shared_1.getLunchEntriesInRange)((0, database_1.getDb)(), startDate, endDate, employeeId);
    const employees = (0, gatepass_shared_1.filterEmployeesWithHistory)((0, gatepass_shared_1.buildLunchEmployeeSummaries)(liveStatuses, entries));
    const monthMap = new Map();
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const monthLabel = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
        monthMap.set(monthLabel, {
            month: monthLabel,
            total_extra_lunch_minutes: 0,
            violation_count: 0,
        });
    }
    for (const entry of entries) {
        if (entry.reason_name.trim().toLowerCase() !== gatepass_shared_1.LUNCH_REASON_NAME) {
            continue;
        }
        const checkedOutAt = (0, gatepass_shared_1.parseTimestamp)(entry.checked_out_at);
        const monthLabel = checkedOutAt
            ? `${checkedOutAt.getFullYear()}-${String(checkedOutAt.getMonth() + 1).padStart(2, '0')}`
            : String(entry.date).slice(0, 7);
        const durationMinutes = (0, gatepass_shared_1.calculateMinutesBetween)(entry.checked_out_at, entry.checked_in_at, new Date());
        const extraLunchMinutes = (0, gatepass_shared_1.calculateExtraLunchMinutes)(durationMinutes);
        const existing = monthMap.get(monthLabel) ?? {
            month: monthLabel,
            total_extra_lunch_minutes: 0,
            violation_count: 0,
        };
        existing.total_extra_lunch_minutes += extraLunchMinutes;
        existing.violation_count += extraLunchMinutes > 0 ? 1 : 0;
        monthMap.set(monthLabel, existing);
    }
    const months = [...monthMap.values()].sort((left, right) => left.month.localeCompare(right.month));
    const totalViolations = employees.reduce((total, employee) => total + employee.violation_count, 0);
    return {
        year,
        allowed_lunch_minutes: gatepass_shared_1.LUNCH_LIMIT_MINUTES,
        employees,
        months,
        total_violations: totalViolations,
        top_employees: (0, gatepass_shared_1.getTopLunchViolators)(employees),
    };
};
exports.getYearlyLunchReport = getYearlyLunchReport;
//# sourceMappingURL=get-yearly-lunch-report.service.js.map