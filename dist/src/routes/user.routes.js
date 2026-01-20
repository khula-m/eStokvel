"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const auth_controller_1 = require("../controllers/auth.controller");
const router = express_1.default.Router();
const controller = new auth_controller_1.AuthController();
router.use(auth_middleware_1.authMiddleware);
router.get("/me", controller.getCurrentUser.bind(controller));
exports.default = router;
//# sourceMappingURL=user.routes.js.map