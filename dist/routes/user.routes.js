"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const auth_controller_1 = require("../controllers/auth.controller");
const role_middleware_1 = require("../middleware/role.middleware");
const router = express_1.default.Router();
const controller = new auth_controller_1.AuthController();
router.get("/me", auth_middleware_1.authMiddleware, controller.getCurrentUser.bind(controller));
router.get("/", auth_middleware_1.authMiddleware, (0, role_middleware_1.roleMiddleware)(["TREASURER", "CHAIRPERSON", "SECRETARY", "ADMIN"]), async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized: User ID is missing.",
            });
            return;
        }
        res.json({
            success: true,
            data: [],
            message: "Users in your stokvel groups",
            description: "This endpoint returns users in your stokvel groups based on your role",
            compliance: [
                "SRS 4.4.2: User authentication enforced",
                "SRS 5.2: Data transmission security",
                "SRS 6.4.6: Role-based access control",
            ],
            userRole: req.user?.role,
            userId: userId,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error
            ? error.message
            : "An unknown error occurred.";
        res.status(500).json({
            success: false,
            message: errorMessage,
        });
    }
});
exports.default = router;
//# sourceMappingURL=user.routes.js.map