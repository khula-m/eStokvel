import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

// JWT_SECRET must always be set — no hardcoded fallbacks in any environment.
// Set it via Railway Variables (production) or .env file (local dev only).
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export { JWT_SECRET, JWT_EXPIRES_IN };

export interface JwtPayload {
  userId: string;
  phoneNumber: string;
  role: string;
  jti: string; // unique token ID — used for revocation
  iat?: number;
}

export const generateToken = (payload: Omit<JwtPayload, 'jti'>): string => {
  return jwt.sign(
    { ...payload, jti: randomUUID() },
    JWT_SECRET as jwt.Secret,
    { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] },
  );
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET as jwt.Secret) as JwtPayload;
  } catch {
    return null;
  }
};
