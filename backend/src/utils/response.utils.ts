import type { Response } from 'express';
import type { ApiResponse } from '../types';

export const sendSuccess = <T>(res: Response, data: T, status = 200): Response =>
  res.status(status).json({ success: true, data } satisfies ApiResponse<T>);

export const sendError = (res: Response, error: string, status = 400): Response =>
  res.status(status).json({ success: false, error } satisfies ApiResponse);

export const sendMessage = (res: Response, message: string, status = 200): Response =>
  res.status(status).json({ success: true, message } satisfies ApiResponse);
