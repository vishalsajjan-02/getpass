import type { Request, Response } from 'express';
import * as GatepassService from '../service';
import { sendSuccess, sendError, sendMessage } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';
import type { CreateGatepassInput, UpdateGatepassStatusInput } from '../../../types';

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.user!;
    sendSuccess(res, await GatepassService.getGatepasses(userId, role));
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getToday = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.user!;
    sendSuccess(res, await GatepassService.getTodaysGatepasses(userId, role));
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};

export const search = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.user!;
    const query = String(req.query.q || '');
    if (!query.trim()) {
      sendSuccess(res, await GatepassService.getGatepasses(userId, role));
      return;
    }
    sendSuccess(res, await GatepassService.searchGatepasses(query, userId, role));
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.user!;
    const filterUserId = role === 'employee' || role === 'guest' ? userId : undefined;
    sendSuccess(res, await GatepassService.getGatepassStats(filterUserId));
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getReasons = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    sendSuccess(res, await GatepassService.getGatepassReasons());
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
};

export const getOne = async (req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, await GatepassService.getGatepassById(req.params.id));
  } catch (err) {
    sendError(res, (err as Error).message, 404);
  }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const input = req.body as CreateGatepassInput;
    if (!input.purpose) {
      sendError(res, 'purpose is required');
      return;
    }
    const gatepass = await GatepassService.createGatepass(req.user!.userId, input);
    sendSuccess(res, gatepass, 201);
  } catch (err) {
    sendError(res, (err as Error).message);
  }
};

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const input = req.body as UpdateGatepassStatusInput;
    if (!input.status) {
      sendError(res, 'status is required');
      return;
    }
    if ((input.status === 'approved' || input.status === 'rejected') && !input.approved_by) {
      input.approved_by = req.user!.userId;
    }
    sendSuccess(res, await GatepassService.updateGatepassStatus(req.params.id, input));
  } catch (err) {
    sendError(res, (err as Error).message);
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await GatepassService.deleteGatepass(req.params.id);
    sendMessage(res, 'Gatepass deleted successfully');
  } catch (err) {
    sendError(res, (err as Error).message, 404);
  }
};
