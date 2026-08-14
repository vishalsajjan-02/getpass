import type { Response } from 'express';
import { registerUserFace, clearUserFace } from '../service/register-user-face.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const registerFaceHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.file?.path) {
      sendError(res, 'Face image file is required');
      return;
    }
    sendSuccess(res, await registerUserFace(id, req.file.path));
  } catch (err) {
    sendError(res, (err as Error).message);
  }
};

export const clearFaceHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    sendSuccess(res, await clearUserFace(id));
  } catch (err) {
    sendError(res, (err as Error).message);
  }
};
