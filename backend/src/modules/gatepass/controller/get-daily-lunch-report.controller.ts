import type { Response } from 'express';
import { getDailyLunchReport as getDailyLunchReportService } from '../service/get-daily-lunch-report.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getDailyLunchReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
    sendSuccess(res, await getDailyLunchReportService(date, employeeId));
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};
