import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.middleware';
import type { UserRole } from '../types';
export declare const requireRole: (...roles: UserRole[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=role.middleware.d.ts.map