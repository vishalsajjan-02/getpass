import type { Response } from 'express';
import { updateGatepassStatus } from '../service/update-gatepass-status.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';
import type { UpdateGatepassStatusInput } from '../../../types';

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const input = req.body as UpdateGatepassStatusInput;
    if (!input.status) {
      sendError(res, 'status is required');
      return;
    }
    sendSuccess(
      res,
      await updateGatepassStatus(req.params.id, input, req.user!.userId, req.user!.role),
    );
  } catch (err) {
    sendError(res, (err as Error).message);
  }
};
