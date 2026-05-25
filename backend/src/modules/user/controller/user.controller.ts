import type { Request, Response } from 'express';
import * as UserService from '../service';
import { sendSuccess, sendError, sendMessage } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';
import type { BulkImportUserInput, CreateUserInput, UpdateUserInput } from '../../../types';

export const getAll = async (_req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, await UserService.getAllUsers());
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getRoles = async (_req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, await UserService.getRoles());
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getDepartments = async (_req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, await UserService.getDepartments());
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getManagers = async (_req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, await UserService.getManagers());
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getOne = async (req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, await UserService.getUserById(req.params.id));
  } catch (err) {
    sendError(res, (err as Error).message, 404);
  }
};

export const bulkImport = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = req.body as { users?: BulkImportUserInput[] };
    if (!Array.isArray(rows.users) || rows.users.length === 0) {
      sendError(res, 'users array is required');
      return;
    }
    sendSuccess(res, await UserService.bulkImportUsers(rows.users), 201);
  } catch (err) {
    sendError(res, (err as Error).message);
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const input = req.body as CreateUserInput;
    if (!input.name || !input.email || !input.password || !input.role) {
      sendError(res, 'name, email, password, and role are required');
      return;
    }
    const user = await UserService.createUser(input);
    sendSuccess(res, user, 201);
  } catch (err) {
    sendError(res, (err as Error).message);
  }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isElevatedRole = req.user?.role === 'admin' || req.user?.role === 'manager';
    if (!isElevatedRole && req.user?.userId !== id) {
      sendError(res, 'Forbidden', 403);
      return;
    }
    const input = req.body as UpdateUserInput;
    if (!isElevatedRole) delete input.role;
    sendSuccess(res, await UserService.updateUser(id, input));
  } catch (err) {
    sendError(res, (err as Error).message, 404);
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await UserService.deleteUser(req.params.id);
    sendMessage(res, 'User deleted successfully');
  } catch (err) {
    sendError(res, (err as Error).message, 404);
  }
};
