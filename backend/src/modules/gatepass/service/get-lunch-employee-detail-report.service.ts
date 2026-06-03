import { getDb } from '../../../config/database';
import {
  buildLunchAnalyticsRangeReport,
  getEmployeeActivityLogsInRange,
  getLiveEmployeeStatusesInternal,
  LUNCH_REASON_NAME,
  normalizeDateRange,
} from './shared/gatepass.shared';
import type { LunchEmployeeDetailReport } from '../../../types';

export const getLunchEmployeeDetailReport = async (
  userId: string,
  startDateParam?: string,
  endDateParam?: string,
): Promise<LunchEmployeeDetailReport> => {
  const { startDate, endDate } = normalizeDateRange(startDateParam, endDateParam);
  const rangeReport = await buildLunchAnalyticsRangeReport(startDate, endDate, userId);
  const liveStatuses = await getLiveEmployeeStatusesInternal(getDb(), userId);
  const liveStatus = liveStatuses[0];
  const employeeSummary = rangeReport.employees[0];
  const activityLogs = await getEmployeeActivityLogsInRange(getDb(), userId, startDate, endDate);

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
    total_outside_office_minutes: activityLogs.reduce(
      (total, log) => total + log.total_outside_office_minutes,
      0,
    ),
    violation_count: employeeSummary?.violation_count ?? 0,
    lunch_entries: employeeSummary?.entries.filter((entry) => entry.reason_name.toLowerCase() === LUNCH_REASON_NAME) ?? [],
    activity_logs: activityLogs,
  };
};
