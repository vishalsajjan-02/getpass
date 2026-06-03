import type { Response } from 'express';
import { getGatepassReasons } from '../service/get-gatepass-reasons.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getReasons = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    sendSuccess(res, await getGatepassReasons());
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};
