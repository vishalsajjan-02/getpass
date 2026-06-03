import type { Response } from 'express';
import { getMe } from '../service/get-me.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getMeHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    sendSuccess(res, await getMe(req.user!.userId));
  } catch (err) {
    sendError(res, (err as Error).message, 404);
  }
};
