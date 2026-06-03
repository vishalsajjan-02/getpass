import type { Response } from 'express';
import { getGatepassById } from '../service/get-gatepass-by-id.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getOne = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.user!;
    sendSuccess(res, await getGatepassById(req.params.id, userId, role));
  } catch (err) {
    sendError(res, (err as Error).message, 404);
  }
};
