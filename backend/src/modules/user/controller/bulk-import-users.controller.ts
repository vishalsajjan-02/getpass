import type { Request, Response } from 'express';
import { bulkImportUsers } from '../service/bulk-import-users.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { BulkImportUserInput } from '../../../types';

export const bulkImport = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = req.body as { users?: BulkImportUserInput[] };
    if (!Array.isArray(rows.users) || rows.users.length === 0) {
      sendError(res, 'users array is required');
      return;
    }
    sendSuccess(res, await bulkImportUsers(rows.users), 201);
  } catch (err) {
    sendError(res, (err as Error).message);
  }
};
