import type { Response } from 'express';
import { createLeaveType } from '../service/create-leave-type.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const createLeaveTypeHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const leaveType = await createLeaveType({
      name: typeof req.body?.name === 'string' ? req.body.name : '',
      is_paid: typeof req.body?.is_paid === 'boolean' ? req.body.is_paid : undefined,
      sort_order: typeof req.body?.sort_order === 'number' ? req.body.sort_order : undefined,
    });
    sendSuccess(res, leaveType, 201);
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};
