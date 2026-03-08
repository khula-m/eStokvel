import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-estokvel-2026');

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET environment variable is required in production');
  process.exit(1);
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phoneNumber: string;
        role: string;
      };
    }
  }
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    phoneNumber: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET as jwt.Secret) as any;
    req.user = {
      id: decoded.userId,
      phoneNumber: decoded.phoneNumber,
      role: decoded.role,
    };
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const authMiddleware = authenticateToken;
