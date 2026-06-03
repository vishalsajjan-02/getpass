import type { Request, Response } from 'express';
import { loginWithCredentials } from '../service/login.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      sendError(res, 'Email and password are required');
      return;
    }
    sendSuccess(res, await loginWithCredentials(email, password));
  } catch (err) {
    sendError(res, (err as Error).message, 401);
  }
};
