import type { Response } from 'express';
import { deleteGatepass } from '../service/delete-gatepass.service';
import { sendError, sendMessage } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await deleteGatepass(req.params.id, req.user!.userId, req.user!.role);
    sendMessage(res, 'Gatepass deleted successfully');
  } catch (err) {
    sendError(res, (err as Error).message, 404);
  }
};
