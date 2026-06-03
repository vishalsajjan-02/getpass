import type { Response } from 'express';
import { checkIn } from '../service/check-in.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const checkInHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = typeof req.body?.user_id === 'string' ? req.body.user_id : undefined;
    if (!userId) {
      sendError(res, 'user_id is required');
      return;
    }
    sendSuccess(res, await checkIn(userId));
  } catch (err) {
    sendError(res, (err as Error).message);
  }
};
