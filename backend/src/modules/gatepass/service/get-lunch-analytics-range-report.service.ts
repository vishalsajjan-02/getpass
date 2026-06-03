import { buildLunchAnalyticsRangeReport, normalizeDateRange } from './shared/gatepass.shared';
import type { LunchAnalyticsRangeReport } from '../../../types';

export const getLunchAnalyticsRangeReport = async (
  startDateParam?: string,
  endDateParam?: string,
  employeeId?: string,
): Promise<LunchAnalyticsRangeReport> => {
  const { startDate, endDate } = normalizeDateRange(startDateParam, endDateParam);
  return buildLunchAnalyticsRangeReport(startDate, endDate, employeeId);
};
