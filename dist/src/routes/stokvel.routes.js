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
        message: "Stokvel routes are working!",
        user: req.user
    });
});
router.post("/", (req, res) => {
    res.json({
        success: true,
        message: "Would create stokvel here",
        data: req.body
    });
});
router.post("/:id/join", (req, res) => {
    const { id } = req.params;
    res.json({
        success: true,
        message: `Joined group with ID: ${id}`
    });
});
exports.default = router;
//# sourceMappingURL=stokvel.routes.js.map