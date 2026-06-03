import type { Response } from 'express';
import { createGatepass } from '../service/create-gatepass.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';
import type { CreateGatepassInput } from '../../../types';

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const input = req.body as CreateGatepassInput;
    if (!input.reason_id && !input.reason_name) {
      sendError(res, 'reason_id is required');
      return;
    }
    const gatepass = await createGatepass(req.user!.userId, input);
    sendSuccess(res, gatepass, 201);
  } catch (err) {
    sendError(res, (err as Error).message);
  }
};
