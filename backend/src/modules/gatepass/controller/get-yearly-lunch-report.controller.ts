import type { Response } from 'express';
import { getYearlyLunchReport as getYearlyLunchReportService } from '../service/get-yearly-lunch-report.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getYearlyLunchReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const year = typeof req.query.year === 'string' ? req.query.year : undefined;
    const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
    sendSuccess(res, await getYearlyLunchReportService(year, employeeId));
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};
