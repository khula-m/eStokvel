import { Request, Response, NextFunction } from "express";

declare module "../middleware/role.middleware" {
  export function roleMiddleware(allowedRoles: string[]): (req: Request, res: Response, next: NextFunction) => void;
}