import type { Response } from 'express';
import { getMyAttendance } from '../service/get-my-attendance.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getMyAttendanceHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    sendSuccess(res, await getMyAttendance(req.user!.userId, date));
  } catch (err) {
    sendError(res, (err as Error).message);
  }
};
