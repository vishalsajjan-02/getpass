import type { Request, Response, NextFunction } from 'express';
import type { AuthPayload } from '../types';
export interface AuthRequest extends Request {
    user?: AuthPayload;
}
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map