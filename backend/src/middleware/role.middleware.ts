import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.middleware';
import { sendError } from '../utils/response.utils';
import type { UserRole } from '../types';

export const requireRole = (...roles: UserRole[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, 'Forbidden: insufficient permissions', 403);
      return;
    }
    next();
  };
