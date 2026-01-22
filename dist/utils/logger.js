"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logDir = "logs";
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir);
}
const logger = (0, winston_1.createLogger)({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: winston_1.format.combine(winston_1.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss"
    }), winston_1.format.errors({ stack: true }), winston_1.format.splat(), winston_1.format.json()),
    defaultMeta: { service: "estokvel-backend" },
    transports: [
        new winston_1.transports.File({
            filename: path_1.default.join(logDir, "error.log"),
            level: "error"
        }),
        new winston_1.transports.File({
            filename: path_1.default.join(logDir, "combined.log")
        }),
        new winston_1.transports.Console({
            format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.simple())
        })
    ]
});
exports.default = logger;
//# sourceMappingURL=logger.js.map