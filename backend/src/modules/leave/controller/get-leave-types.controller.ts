import type { Response } from 'express';
import { getLeaveTypes } from '../service/get-leave-types.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getLeaveTypesHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const includeInactive =
      req.query.include_inactive === '1' ||
      req.query.include_inactive === 'true';
    sendSuccess(res, await getLeaveTypes({ includeInactive }));
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};
