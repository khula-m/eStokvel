import { createLogger, format, transports } from "winston";
import fs from "fs";
import path from "path";

// Create logs directory if it doesn't exist
const logDir = "logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss"
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: "estokvel-backend" },
  transports: [
    new transports.File({ 
      filename: path.join(logDir, "error.log"), 
      level: "error" 
    }),
    new transports.File({ 
      filename: path.join(logDir, "combined.log") 
    }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

export default logger;