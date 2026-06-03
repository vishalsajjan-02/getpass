import type { Request, Response } from 'express';
import { guestLogin } from '../service/guest-login.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';

export const guestLoginHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body as { code?: string };
    if (!code) {
      sendError(res, 'Guest code is required');
      return;
    }
    sendSuccess(res, await guestLogin(code));
  } catch (err) {
    sendError(res, (err as Error).message, 401);
  }
};
