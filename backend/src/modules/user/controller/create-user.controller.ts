import type { Request, Response } from 'express';
import { createUser } from '../service/create-user.service';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { CreateUserInput } from '../../../types';

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const input = req.body as CreateUserInput;
    if (!input.name || !input.email || !input.password || !input.role) {
      sendError(res, 'name, email, password, and role are required');
      return;
    }
    const user = await createUser(input);
    sendSuccess(res, user, 201);
  } catch (err) {
    sendError(res, (err as Error).message);
  }
};
