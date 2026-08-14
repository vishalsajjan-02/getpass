import type { Response } from 'express';
import { getCompanyHolidays } from '../service/get-company-holidays.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getCompanyHolidaysHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const yearRaw = typeof req.query.year === 'string' ? Number(req.query.year) : undefined;
    const year = yearRaw !== undefined && Number.isFinite(yearRaw) ? yearRaw : undefined;
    sendSuccess(res, await getCompanyHolidays(year));
  } catch (err) {
    sendError(res, (err as Error).message, 400);
  }
};
