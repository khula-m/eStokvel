"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleMiddleware = void 0;
const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User not authenticated."
            });
        }
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You do not have the required role to access this resource."
            });
        }
        else {
            next();
            return;
        }
    };
};
exports.roleMiddleware = roleMiddleware;
//# sourceMappingURL=role.middleware.js.map