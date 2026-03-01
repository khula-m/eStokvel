import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/jwt";

// Extend the Request type to include the user property

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
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required"
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET as jwt.Secret) as any;
    req.user = {
      id: decoded.userId,
      phoneNumber: decoded.phoneNumber,
      role: decoded.role
    };
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

// Export as authMiddleware for consistency
export const authMiddleware = authenticateToken;
