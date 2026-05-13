import type { Request, Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.middleware';
export declare const getAll: (_req: Request, res: Response) => Promise<void>;
export declare const getRoles: (_req: Request, res: Response) => Promise<void>;
export declare const getOne: (req: Request, res: Response) => Promise<void>;
export declare const create: (req: Request, res: Response) => Promise<void>;
export declare const update: (req: AuthRequest, res: Response) => Promise<void>;
export declare const remove: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=user.controller.d.ts.map