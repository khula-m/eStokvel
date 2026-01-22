import { Request, Response, NextFunction } from "express";
export declare const roleMiddleware: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=role.middleware.d.ts.map