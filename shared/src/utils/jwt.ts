import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types';

export const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-estokvel-2026');
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || (process.env.NODE_ENV === 'production' ? '24h' : '7d');

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET environment variable is required in production');
  process.exit(1);
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET as jwt.Secret, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET as jwt.Secret) as JwtPayload;
  } catch {
    return null;
  }
};
