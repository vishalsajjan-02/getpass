import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import { sendError } from '../utils/response.utils';
import type { AuthPayload } from '../types';
import { getDb } from '../config/database';

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    sendError(res, 'No token provided', 401);
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyToken(token);

    // Ensure the token still maps to an active user (guards against DB reseed / soft-delete).
    const result = await getDb().query(
      `SELECT u.id, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [payload.userId],
    );
    const row = result.rows[0] as { id: string; role: AuthPayload['role'] } | undefined;
    if (!row) {
      sendError(res, 'Session expired. Please log in again.', 401);
      return;
    }

    req.user = {
      userId: row.id,
      email: payload.email,
      role: row.role,
    };
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401);
  }
};
