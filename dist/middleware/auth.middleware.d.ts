import { Request, Response, NextFunction } from "express";
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
export declare const authenticateToken: (req: AuthRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const authMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=auth.middleware.d.ts.map