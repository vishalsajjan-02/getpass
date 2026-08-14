import type { Response } from 'express';
import { getAttendanceGridReport } from '../service/get-attendance-grid.service';
import { getAttendanceReport } from '../service/get-attendance-report.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getAttendanceReportHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const view = typeof req.query.view === 'string' ? req.query.view : undefined;
    if (view === 'grid') {
      sendSuccess(res, await getAttendanceGridReport({ date, month, from, to }));
    } else {
      sendSuccess(res, await getAttendanceReport({ date, month, from, to }));
    }
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};
