import type { Response } from 'express';
import { getLiveEmployeeStatuses as getLiveEmployeeStatusesService } from '../service/get-live-employee-statuses.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const getLiveEmployeeStatuses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
    sendSuccess(res, await getLiveEmployeeStatusesService(employeeId));
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};
