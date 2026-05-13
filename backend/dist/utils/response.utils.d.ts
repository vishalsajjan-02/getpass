import type { Response } from 'express';
export declare const sendSuccess: <T>(res: Response, data: T, status?: number) => Response;
export declare const sendError: (res: Response, error: string, status?: number) => Response;
export declare const sendMessage: (res: Response, message: string, status?: number) => Response;
//# sourceMappingURL=response.utils.d.ts.map