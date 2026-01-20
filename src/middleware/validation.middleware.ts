import { Request, Response, NextFunction } from "express";

/** Simple required-field validator */
export const requireFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = fields.filter((field) => !(req.body && req.body[field] !== undefined));
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }
    return next();
  };
};
