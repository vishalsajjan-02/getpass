import type { Response } from 'express';
import { setPunchPermission } from '../service/set-punch-permission.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const setPunchPermissionHandler = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const enabled = req.body?.can_self_punch;
    if (typeof enabled !== 'boolean') {
      sendError(res, 'can_self_punch (boolean) is required');
      return;
    }
    sendSuccess(res, await setPunchPermission(id, enabled));
  } catch (err) {
    sendError(res, (err as Error).message);
  }
};
