import { buildLunchAnalyticsRangeReport, parseMonthParam } from './shared/gatepass.shared';
import type { MonthlyLunchReport } from '../../../types';

export const getMonthlyLunchReport = async (
  monthParam?: string,
  employeeId?: string,
): Promise<MonthlyLunchReport> => {
  const { monthLabel, startDate, endDate } = parseMonthParam(monthParam);
  const rangeReport = await buildLunchAnalyticsRangeReport(startDate, endDate, employeeId);

  return {
    month: monthLabel,
    allowed_lunch_minutes: rangeReport.allowed_lunch_minutes,
    employees: rangeReport.employees,
    total_violations: rangeReport.total_violations,
    top_employees: rangeReport.top_employees,
  };
};
