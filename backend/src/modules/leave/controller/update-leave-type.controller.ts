import type { Response } from 'express';
import { updateLeaveType } from '../service/update-leave-type.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const updateLeaveTypeHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const leaveType = await updateLeaveType({
      id,
      name: typeof req.body?.name === 'string' ? req.body.name : undefined,
      is_paid: typeof req.body?.is_paid === 'boolean' ? req.body.is_paid : undefined,
      is_active: typeof req.body?.is_active === 'boolean' ? req.body.is_active : undefined,
      sort_order: typeof req.body?.sort_order === 'number' ? req.body.sort_order : undefined,
    });
    sendSuccess(res, leaveType);
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};
