import type { Response } from 'express';
import { getGatepassStats } from '../service/get-gatepass-stats.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.user!;
    sendSuccess(res, await getGatepassStats(userId, role));
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};
