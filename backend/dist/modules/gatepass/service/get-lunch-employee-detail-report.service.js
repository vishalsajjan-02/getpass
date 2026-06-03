"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLunchEmployeeDetailReport = void 0;
const database_1 = require("../../../config/database");
const gatepass_shared_1 = require("./shared/gatepass.shared");
const getLunchEmployeeDetailReport = async (userId, startDateParam, endDateParam) => {
    const { startDate, endDate } = (0, gatepass_shared_1.normalizeDateRange)(startDateParam, endDateParam);
    const rangeReport = await (0, gatepass_shared_1.buildLunchAnalyticsRangeReport)(startDate, endDate, userId);
    const liveStatuses = await (0, gatepass_shared_1.getLiveEmployeeStatusesInternal)((0, database_1.getDb)(), userId);
    const liveStatus = liveStatuses[0];
    const employeeSummary = rangeReport.employees[0];
    const activityLogs = await (0, gatepass_shared_1.getEmployeeActivityLogsInRange)((0, database_1.getDb)(), userId, startDate, endDate);
    if (!employeeSummary && !liveStatus) {
        throw new Error('Employee lunch history not found');
    }
    return {
        user_id: userId,
        employee_name: employeeSummary?.employee_name ?? liveStatus?.employee_name ?? 'Unknown Employee',
        department: employeeSummary?.department ?? liveStatus?.department,
        start_date: startDate,
        end_date: endDate,
        current_status: employeeSummary?.current_status ?? liveStatus?.current_status ?? 'In Office',
        checked_out_at: employeeSummary?.checked_out_at ?? liveStatus?.checked_out_at,
        checked_in_at: employeeSummary?.checked_in_at ?? liveStatus?.checked_in_at,
        total_lunch_duration_minutes: employeeSummary?.total_lunch_duration_minutes ?? 0,
        total_extra_lunch_minutes: employeeSummary?.total_extra_lunch_minutes ?? 0,
        total_outside_office_minutes: activityLogs.reduce((total, log) => total + log.total_outside_office_minutes, 0),
        violation_count: employeeSummary?.violation_count ?? 0,
        lunch_entries: employeeSummary?.entries.filter((entry) => entry.reason_name.toLowerCase() === gatepass_shared_1.LUNCH_REASON_NAME) ?? [],
        activity_logs: activityLogs,
    };
};
exports.getLunchEmployeeDetailReport = getLunchEmployeeDetailReport;
//# sourceMappingURL=get-lunch-employee-detail-report.service.js.map