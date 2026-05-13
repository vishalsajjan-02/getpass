import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthPayload } from '../types';

export const signToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
};

export const verifyToken = (token: string): AuthPayload => {
  return jwt.verify(token, env.JWT_SECRET) as AuthPayload;
};
