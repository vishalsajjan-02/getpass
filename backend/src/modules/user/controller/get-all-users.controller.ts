import type { Request, Response } from 'express';
import { getAllUsers } from '../service/get-all-users.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';

export const getAll = async (_req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, await getAllUsers());
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};
