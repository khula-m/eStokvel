"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
    const status = err.status || 500;
    const message = err.message || "Internal server error";
    console.error("Unhandled error:", err);
    res.status(status).json({ success: false, message });
}
//# sourceMappingURL=error.middleware.js.map