import type { Response } from 'express';
import { getDailyReport } from '../service/get-daily-report.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getDailyReportHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    sendSuccess(res, await getDailyReport(date));
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};
