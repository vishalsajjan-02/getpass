import type { Response } from 'express';
import { setUserLeaveBalance } from '../service/set-user-leave-balance.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const setUserLeaveBalanceHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = typeof req.body?.user_id === 'string' ? req.body.user_id : '';
    const leaveBalanceRaw = req.body?.leave_balance;
    const leaveBalance =
      typeof leaveBalanceRaw === 'number'
        ? leaveBalanceRaw
        : typeof leaveBalanceRaw === 'string'
          ? Number(leaveBalanceRaw)
          : NaN;

    if (!userId) throw new Error('user_id is required');
    if (!Number.isFinite(leaveBalance)) throw new Error('leave_balance must be a number');

    sendSuccess(res, await setUserLeaveBalance({ userId, leaveBalance }));
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};
