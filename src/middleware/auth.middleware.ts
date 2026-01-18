import { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader } from "../utils/jwt";
import { prisma } from "../utils/prisma";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: "No authentication token provided"
      });
      return;
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found"
      });
      return;
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
}

export async function requireRoles(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }
    
    // For now, we'll check if user is admin or treasurer
    // You can enhance this based on your role system
    const userRoles = [req.user.role || "MEMBER"];
    
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      res.status(403).json({
        success: false,
        message: "Insufficient permissions"
      });
      return;
    }
    
    next();
  };
}
