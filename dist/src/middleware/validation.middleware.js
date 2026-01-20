"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireFields = void 0;
const requireFields = (fields) => {
    return (req, res, next) => {
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
exports.requireFields = requireFields;
//# sourceMappingURL=validation.middleware.js.map