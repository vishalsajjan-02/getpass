import type { Response } from 'express';
import { getGatepasses } from '../service/get-gatepasses.service';
import { searchGatepasses } from '../service/search-gatepasses.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';

export const search = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.user!;
    const query = String(req.query.q || '');
    if (!query.trim()) {
      sendSuccess(res, await getGatepasses(userId, role));
      return;
    }
    sendSuccess(res, await searchGatepasses(query, userId, role));
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};
