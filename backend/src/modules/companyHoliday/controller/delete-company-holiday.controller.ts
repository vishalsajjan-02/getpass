import type { Response } from 'express';
import { deleteCompanyHoliday } from '../service/delete-company-holiday.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const deleteCompanyHolidayHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    sendSuccess(res, await deleteCompanyHoliday(id));
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};
