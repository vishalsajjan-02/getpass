import type { Response } from 'express';
import { getUserHistory, getUserMonthAttendance } from '../service/get-user-history.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getUserHistoryHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = req.user;
    const targetUserId = req.params.userId;

    // Managers and employees may only view their own attendance history.
    if (
      (actor?.role === 'manager' || actor?.role === 'employee') &&
      actor.userId !== targetUserId
    ) {
      sendError(res, 'You can only view your own attendance', 403);
      return;
    }

    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    if (month) {
      sendSuccess(res, await getUserMonthAttendance(targetUserId, month));
      return;
    }

    const fromDate = typeof req.query.from === 'string' ? req.query.from : undefined;
    const toDate = typeof req.query.to === 'string' ? req.query.to : undefined;
    sendSuccess(res, await getUserHistory(targetUserId, fromDate, toDate));
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};
