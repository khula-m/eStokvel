import jwt from "jsonwebtoken";

// Single source of truth for JWT configuration
// In production, JWT_SECRET MUST be set as an environment variable
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-estokvel-2026');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required in production');
  process.exit(1);
}

// Export the secret for use by auth middleware
export { JWT_SECRET, JWT_EXPIRES_IN };

interface JwtPayload {
  userId: string;
  phoneNumber: string;
  role: string;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET as jwt.Secret, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET as jwt.Secret) as JwtPayload;
  } catch (error) {
    return null;
  }
};
