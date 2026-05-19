import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JwtPayload } from "../utils/jwt";
import { getRedisClient, isRedisReady } from "../utils/redis";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; phoneNumber: string; role: string };
    }
  }
}

export interface AuthRequest extends Request {
  user?: { id: string; phoneNumber: string; role: string };
}

// Redis key pattern: revoke_before:<userId> → Unix timestamp (seconds).
// Any token with iat < that timestamp is considered revoked.
export const REVOKE_PREFIX = 'revoke_before:';

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, JWT_SECRET as jwt.Secret) as JwtPayload;
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }

  // Check revocation: if the token was issued before the user's revoke_before
  // timestamp (set on PIN change / account lock / deletion), reject it.
  if (isRedisReady()) {
    try {
      const revokedAt = await getRedisClient()!.get(`${REVOKE_PREFIX}${decoded.userId}`);
      if (revokedAt && decoded.iat && decoded.iat < Number(revokedAt)) {
        return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
      }
    } catch {
      // Redis error — allow the request through rather than blocking all authenticated users
    }
  }

  req.user = { id: decoded.userId, phoneNumber: decoded.phoneNumber, role: decoded.role };
  return next();
};

export const authMiddleware = authenticateToken;
