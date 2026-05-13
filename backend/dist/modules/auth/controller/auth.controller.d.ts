import type { Request, Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.middleware';
export declare const login: (req: Request, res: Response) => Promise<void>;
export declare const guestLogin: (req: Request, res: Response) => Promise<void>;
export declare const getMe: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map