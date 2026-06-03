import type { Request, Response } from 'express';
import { getDepartments } from '../service/get-departments.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';

export const getDepartmentsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, await getDepartments());
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};
