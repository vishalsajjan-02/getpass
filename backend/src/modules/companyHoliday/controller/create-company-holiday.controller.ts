import type { Response } from 'express';
import { createCompanyHoliday } from '../service/create-company-holiday.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const createCompanyHolidayHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const holiday = await createCompanyHoliday({
      name: typeof req.body?.name === 'string' ? req.body.name : '',
      description: typeof req.body?.description === 'string' ? req.body.description : undefined,
      holiday_date: typeof req.body?.holiday_date === 'string' ? req.body.holiday_date : '',
      is_fixed: typeof req.body?.is_fixed === 'boolean' ? req.body.is_fixed : undefined,
      is_paid: typeof req.body?.is_paid === 'boolean' ? req.body.is_paid : undefined,
      sort_order: typeof req.body?.sort_order === 'number' ? req.body.sort_order : undefined,
    });
    sendSuccess(res, holiday, 201);
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};
