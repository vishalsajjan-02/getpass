import type { Response } from 'express';
import * as UserInOutTimeService from '../service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getDailyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    sendSuccess(res, await UserInOutTimeService.getDailyReport(date));
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};

export const checkIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = typeof req.body?.user_id === 'string' ? req.body.user_id : undefined;
    if (!userId) {
      sendError(res, 'user_id is required');
      return;
    }
    sendSuccess(res, await UserInOutTimeService.checkIn(userId));
  } catch (err) {
    sendError(res, (err as Error).message);
  }
};

export const checkOut = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = typeof req.body?.user_id === 'string' ? req.body.user_id : undefined;
    if (!userId) {
      sendError(res, 'user_id is required');
      return;
    }
    sendSuccess(res, await UserInOutTimeService.checkOut(userId));
  } catch (err) {
    sendError(res, (err as Error).message);
  }
};

export const getUserHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const fromDate = typeof req.query.from === 'string' ? req.query.from : undefined;
    const toDate = typeof req.query.to === 'string' ? req.query.to : undefined;
    sendSuccess(
      res,
      await UserInOutTimeService.getUserHistory(req.params.userId, fromDate, toDate),
    );
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};
