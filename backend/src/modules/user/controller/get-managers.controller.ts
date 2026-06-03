import type { Request, Response } from 'express';
import { getManagers } from '../service/get-managers.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';

export const getManagersHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, await getManagers());
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};
