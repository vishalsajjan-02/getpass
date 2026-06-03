import type { Request, Response } from 'express';
import { getUserById } from '../service/get-user-by-id.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';

export const getOne = async (req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, await getUserById(req.params.id));
  } catch (err) {
    sendError(res, (err as Error).message, 404);
  }
};
