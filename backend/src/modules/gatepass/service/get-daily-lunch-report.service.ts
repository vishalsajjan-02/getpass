import { buildLunchAnalyticsRangeReport, parseDateParam } from './shared/gatepass.shared';
import type { DailyLunchReport } from '../../../types';

export const getDailyLunchReport = async (
  dateParam?: string,
  employeeId?: string,
): Promise<DailyLunchReport> => {
  const date = parseDateParam(dateParam, new Date());
  const rangeReport = await buildLunchAnalyticsRangeReport(date, date, employeeId);

  return {
    date,
    allowed_lunch_minutes: rangeReport.allowed_lunch_minutes,
    employees: rangeReport.employees,
    total_violations: rangeReport.total_violations,
  };
};
