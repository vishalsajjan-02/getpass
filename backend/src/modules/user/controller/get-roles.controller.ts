import type { Request, Response } from 'express';
import { getRoles } from '../service/get-roles.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';

export const getRolesHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, await getRoles());
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};
