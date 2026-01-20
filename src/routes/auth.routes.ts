import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();
const authController = new AuthController();

// Public routes
router.post("/register", authController.register.bind(authController));
router.post("/login", authController.login.bind(authController));
router.post("/verify-pin", authController.verifyPin.bind(authController));

// Protected routes (require authentication)
router.get("/me", authMiddleware, authController.getCurrentUser.bind(authController));

export default router;
