import type { Response } from 'express';
import { getUserHistory } from '../service/get-user-history.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getUserHistoryHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const fromDate = typeof req.query.from === 'string' ? req.query.from : undefined;
    const toDate = typeof req.query.to === 'string' ? req.query.to : undefined;
    sendSuccess(res, await getUserHistory(req.params.userId, fromDate, toDate));
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};
