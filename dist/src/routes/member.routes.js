"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.authMiddleware);
router.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Member routes are working!",
        user: req.user
    });
});
router.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "Fetched group members successfully!",
    });
});
router.post("/", (_req, res) => {
    res.json({
        success: true,
        message: "Member added successfully!",
    });
});
router.put("/:id/role", (req, res) => {
    const { id } = req.params;
    res.json({
        success: true,
        message: `Updated role for member with ID: ${id}`,
    });
});
exports.default = router;
//# sourceMappingURL=member.routes.js.map