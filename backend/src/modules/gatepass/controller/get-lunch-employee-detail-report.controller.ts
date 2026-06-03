import type { Response } from 'express';
import { getLunchEmployeeDetailReport as getLunchEmployeeDetailReportService } from '../service/get-lunch-employee-detail-report.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getLunchEmployeeDetailReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
    sendSuccess(
      res,
      await getLunchEmployeeDetailReportService(req.params.userId, startDate, endDate),
    );
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};
