import type { Response } from 'express';
import { getTodaysGatepasses } from '../service/get-todays-gatepasses.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getToday = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.user!;
    sendSuccess(res, await getTodaysGatepasses(userId, role));
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};
