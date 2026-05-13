import type { Request, Response } from 'express';
import * as AuthService from '../service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      sendError(res, 'Email and password are required');
      return;
    }
    const result = await AuthService.loginWithCredentials(email, password);
    sendSuccess(res, result);
  } catch (err) {
    sendError(res, (err as Error).message, 401);
  }
};

export const guestLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body as { code?: string };
    if (!code) {
      sendError(res, 'Guest code is required');
      return;
    }
    const result = await AuthService.guestLogin(code);
    sendSuccess(res, result);
  } catch (err) {
    sendError(res, (err as Error).message, 401);
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await AuthService.getMe(req.user!.userId);
    sendSuccess(res, user);
  } catch (err) {
    sendError(res, (err as Error).message, 404);
  }
};
