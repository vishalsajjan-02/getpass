import type { Response } from 'express';
import { updateCompanyHoliday } from '../service/update-company-holiday.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const updateCompanyHolidayHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const holiday = await updateCompanyHoliday({
      id,
      name: typeof req.body?.name === 'string' ? req.body.name : undefined,
      description: typeof req.body?.description === 'string' ? req.body.description : undefined,
      holiday_date: typeof req.body?.holiday_date === 'string' ? req.body.holiday_date : undefined,
      is_fixed: typeof req.body?.is_fixed === 'boolean' ? req.body.is_fixed : undefined,
      is_paid: typeof req.body?.is_paid === 'boolean' ? req.body.is_paid : undefined,
      is_active: typeof req.body?.is_active === 'boolean' ? req.body.is_active : undefined,
      sort_order: typeof req.body?.sort_order === 'number' ? req.body.sort_order : undefined,
    });
    sendSuccess(res, holiday);
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};
