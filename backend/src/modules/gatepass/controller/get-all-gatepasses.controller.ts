import type { Response } from 'express';
import { getGatepasses } from '../service/get-gatepasses.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.user!;
    sendSuccess(res, await getGatepasses(userId, role));
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};
