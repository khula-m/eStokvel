import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleMiddleware } from "../middleware/role.middleware";
import { authRateLimiter } from "../middleware/rateLimiter.middleware";

const router = Router();
const authController = new AuthController();

// Public routes - Mobile PIN login (ADMIN + MEMBER only)
router.post("/login", authRateLimiter, authController.login.bind(authController));

// Public routes - Superadmin web portal login (email + password)
router.post("/superadmin/login", authRateLimiter, authController.superadminLogin.bind(authController));

// Protected routes (any authenticated user)
router.get("/me", authMiddleware, authController.getCurrentUser.bind(authController));
router.post("/change-pin", authMiddleware, authController.changePin.bind(authController));

// SUPERADMIN-only routes
router.post("/admin/create", authMiddleware, roleMiddleware(['SUPERADMIN']), authController.createAdmin.bind(authController));
router.get("/admin/list", authMiddleware, roleMiddleware(['SUPERADMIN']), authController.listAdmins.bind(authController));
router.delete("/admin/:adminId", authMiddleware, roleMiddleware(['SUPERADMIN']), authController.deleteAdmin.bind(authController));
router.get("/system/overview", authMiddleware, roleMiddleware(['SUPERADMIN']), authController.getSystemOverview.bind(authController));

// ADMIN-only routes
router.post("/member/add", authMiddleware, roleMiddleware(['ADMIN']), authController.addMember.bind(authController));

export default router;
