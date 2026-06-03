import type { Request, Response } from 'express';
import { deleteUser } from '../service/delete-user.service';
import { sendError, sendMessage } from '../../../utils/response.utils';

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteUser(req.params.id);
    sendMessage(res, 'User deleted successfully');
  } catch (err) {
    sendError(res, (err as Error).message, 404);
  }
};
