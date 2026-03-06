import { createLogger, format, transports } from "winston";
import fs from "fs";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";

// Build transport list based on environment
const buildTransports = () => {
  const transportList: any[] = [];

  if (isProduction) {
    // In production/containers: JSON to stdout/stderr only
    // Container orchestrators (Docker, Railway, ECS) capture stdout automatically
    transportList.push(
      new transports.Console({
        format: format.combine(format.json()),
      })
    );
  } else {
    // In development: colorized console + file logs
    const logDir = "logs";
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }

    transportList.push(
      new transports.File({
        filename: path.join(logDir, "error.log"),
        level: "error",
      }),
      new transports.File({
        filename: path.join(logDir, "combined.log"),
      }),
      new transports.Console({
        format: format.combine(format.colorize(), format.simple()),
      })
    );
  }

  return transportList;
};

const logger = createLogger({
  level: isProduction ? "info" : "debug",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: "estokvel-backend" },
  transports: buildTransports(),
});

export default logger;