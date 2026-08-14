import type { Response } from 'express';
import { upsertUserDayLeave } from '../service/upsert-user-day-leave.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const upsertUserDayLeaveHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = typeof req.body?.user_id === 'string' ? req.body.user_id : '';
    const date = typeof req.body?.date === 'string' ? req.body.date : '';
    const leaveTypeId =
      req.body?.leave_type_id === null
        ? null
        : typeof req.body?.leave_type_id === 'string'
          ? req.body.leave_type_id
          : undefined;

    if (!userId || !date) {
      throw new Error('user_id and date are required');
    }
    if (leaveTypeId === undefined) {
      throw new Error('leave_type_id is required (or null to clear)');
    }

    sendSuccess(res, await upsertUserDayLeave({ userId, date, leaveTypeId }));
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};
