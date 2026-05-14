import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.middleware';
export declare const getAll: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getToday: (req: AuthRequest, res: Response) => Promise<void>;
export declare const search: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getStats: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getReasons: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const getDailyLunchReport: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getMonthlyLunchReport: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getYearlyLunchReport: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getLiveEmployeeStatuses: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getOne: (req: AuthRequest, res: Response) => Promise<void>;
export declare const create: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateStatus: (req: AuthRequest, res: Response) => Promise<void>;
export declare const remove: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=gatepass.controller.d.ts.map