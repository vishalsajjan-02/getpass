import type { Response } from 'express';
import { getMonthlyLunchReport as getMonthlyLunchReportService } from '../service/get-monthly-lunch-report.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getMonthlyLunchReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
    sendSuccess(res, await getMonthlyLunchReportService(month, employeeId));
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};
