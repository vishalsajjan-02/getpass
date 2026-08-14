import type { Response } from 'express';
import { updateUser } from '../service/update-user.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';
import type { UpdateUserInput } from '../../../types';

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isElevatedRole = req.user?.role === 'admin' || req.user?.role === 'manager';
    if (!isElevatedRole && req.user?.userId !== id) {
      sendError(res, 'Forbidden', 403);
      return;
    }
    const input = req.body as UpdateUserInput;
    if (!isElevatedRole) delete input.role;
    // Punch permission is managed only via /users/:id/punch-permission
    delete (input as { can_self_punch?: boolean }).can_self_punch;
    sendSuccess(res, await updateUser(id, input));
  } catch (err) {
    const message = (err as Error).message;
    const status =
      /already in use|Invalid role|Email is required/i.test(message) ? 400 :
      /not found/i.test(message) ? 404 :
      400;
    sendError(res, message, status);
  }
};
