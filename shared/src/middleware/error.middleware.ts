import { NextFunction, Request, Response } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const isProd = process.env.NODE_ENV === 'production';

  // Prisma errors (check by code pattern rather than importing PrismaClient)
  if (err.code && err.code.startsWith('P')) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({ success: false, message: 'A record with this data already exists' });
      case 'P2025':
        return res.status(404).json({ success: false, message: 'Record not found' });
      case 'P2003':
        return res.status(400).json({ success: false, message: 'Related record not found' });
      default:
        return res.status(500).json({
          success: false,
          message: isProd ? 'Internal server error' : `Database error: ${err.code}`,
        });
    }
  }

  const status = err.status || err.statusCode || 500;
  const message = status >= 500 && isProd ? 'Internal server error' : err.message || 'Internal server error';

  return res.status(status).json({ success: false, message });
}
