import type { Response } from 'express';
import { getLunchAnalyticsRangeReport as getLunchAnalyticsRangeReportService } from '../service/get-lunch-analytics-range-report.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getLunchAnalyticsRangeReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
    const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
    sendSuccess(res, await getLunchAnalyticsRangeReportService(startDate, endDate, employeeId));
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};
