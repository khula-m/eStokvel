import { createLogger as winstonCreateLogger, format, transports } from 'winston';
import fs from 'fs';
import path from 'path';

export function createLogger(serviceName: string) {
  const isProduction = process.env.NODE_ENV === 'production';

  const buildTransports = () => {
    const transportList: any[] = [];

    if (isProduction) {
      transportList.push(
        new transports.Console({ format: format.combine(format.json()) })
      );
    } else {
      const logDir = 'logs';
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

      transportList.push(
        new transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
        new transports.File({ filename: path.join(logDir, 'combined.log') }),
        new transports.Console({ format: format.combine(format.colorize(), format.simple()) })
      );
    }
    return transportList;
  };

  return winstonCreateLogger({
    level: isProduction ? 'info' : 'debug',
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      format.splat(),
      format.json()
    ),
    defaultMeta: { service: serviceName },
    transports: buildTransports(),
  });
}
