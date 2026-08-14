import type { Response } from 'express';
import { deleteLeaveType } from '../service/delete-leave-type.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const deleteLeaveTypeHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    sendSuccess(res, await deleteLeaveType(id));
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};
