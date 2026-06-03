import { getDb } from '../../../config/database';
import {
  buildLunchEmployeeSummaries,
  calculateExtraLunchMinutes,
  calculateMinutesBetween,
  filterEmployeesWithHistory,
  getLiveEmployeeStatusesInternal,
  getLunchEntriesInRange,
  getTopLunchViolators,
  LUNCH_LIMIT_MINUTES,
  LUNCH_REASON_NAME,
  parseTimestamp,
  parseYearParam,
} from './shared/gatepass.shared';
import type { YearlyLunchMonthSummary, YearlyLunchReport } from '../../../types';

export const getYearlyLunchReport = async (
  yearParam?: string,
  employeeId?: string,
): Promise<YearlyLunchReport> => {
  const { year, startDate, endDate } = parseYearParam(yearParam);
  const liveStatuses = await getLiveEmployeeStatusesInternal(getDb(), employeeId);
  const entries = await getLunchEntriesInRange(getDb(), startDate, endDate, employeeId);
  const employees = filterEmployeesWithHistory(buildLunchEmployeeSummaries(liveStatuses, entries));
  const monthMap = new Map<string, YearlyLunchMonthSummary>();

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthLabel = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    monthMap.set(monthLabel, {
      month: monthLabel,
      total_extra_lunch_minutes: 0,
      violation_count: 0,
    });
  }

  for (const entry of entries) {
    if (entry.reason_name.trim().toLowerCase() !== LUNCH_REASON_NAME) {
      continue;
    }

    const checkedOutAt = parseTimestamp(entry.checked_out_at);
    const monthLabel = checkedOutAt
      ? `${checkedOutAt.getFullYear()}-${String(checkedOutAt.getMonth() + 1).padStart(2, '0')}`
      : String(entry.date).slice(0, 7);
    const durationMinutes = calculateMinutesBetween(entry.checked_out_at, entry.checked_in_at, new Date());
    const extraLunchMinutes = calculateExtraLunchMinutes(durationMinutes);
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
    allowed_lunch_minutes: LUNCH_LIMIT_MINUTES,
    employees,
    months,
    total_violations: totalViolations,
    top_employees: getTopLunchViolators(employees),
  };
};
