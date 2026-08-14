import type { Response } from 'express';
import { setDayAttendanceStatus } from '../service/set-day-attendance-status.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const setDayAttendanceStatusHandler = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = typeof req.body?.user_id === 'string' ? req.body.user_id : '';
    const date = typeof req.body?.date === 'string' ? req.body.date : '';
    const statusRaw = typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : '';

    if (!userId || !date) {
      throw new Error('user_id and date are required');
    }
    if (statusRaw !== 'present' && statusRaw !== 'absent') {
      throw new Error('status must be present or absent');
    }

    sendSuccess(
      res,
      await setDayAttendanceStatus({
        userId,
        date,
        status: statusRaw,
      }),
    );
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};
