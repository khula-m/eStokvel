import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import logger from '../utils/logger';

/**
 * Global error handler — sanitizes errors in production,
 * maps Prisma error codes to HTTP status codes.
 */
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const isProd = process.env.NODE_ENV === "production";

  // Prisma error mapping
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": // Unique constraint violation
        return res.status(409).json({
          success: false,
          message: "A record with this data already exists",
        });
      case "P2025": // Record not found
        return res.status(404).json({
          success: false,
          message: "Record not found",
        });
      case "P2003": // Foreign key constraint failed
        return res.status(400).json({
          success: false,
          message: "Related record not found",
        });
      default:
        logger.error(`Prisma error [${err.code}]:`, err.message);
        return res.status(500).json({
          success: false,
          message: isProd ? "Internal server error" : `Database error: ${err.code}`,
        });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error("Prisma validation error:", err.message);
    return res.status(400).json({
      success: false,
      message: isProd ? "Invalid request data" : err.message.split("\n").pop(),
    });
  }

  // Generic error
  const status = err.status || err.statusCode || 500;
  const message = status >= 500 && isProd
    ? "Internal server error"
    : err.message || "Internal server error";

  if (status >= 500) {
    logger.error("Unhandled error:", err.stack || err);
  }

  return res.status(status).json({ success: false, message });
}
