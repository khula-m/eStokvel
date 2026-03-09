import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleMiddleware } from "../middleware/role.middleware";
import { authRateLimiter, superadminRateLimiter } from "../middleware/rateLimiter.middleware";
import { sensitiveLimiter, memberAddLimiter } from "../middleware/security.middleware";
import { auditLog } from "../middleware/audit.middleware";
import {
  validate,
  loginSchema,
  superadminLoginSchema,
  changePinSchema,
  createAdminSchema,
  addMemberSchema,
} from "../middleware/zodValidation.middleware";

const router = Router();
const authController = new AuthController();

// Public routes - Mobile PIN login (ADMIN + MEMBER only)
router.post("/login", authRateLimiter, validate(loginSchema), authController.login.bind(authController));

// Public routes - Superadmin web portal login (email + password)
router.post("/superadmin/login", superadminRateLimiter, validate(superadminLoginSchema), authController.superadminLogin.bind(authController));

// Protected routes (any authenticated user)
router.get("/me", authMiddleware, authController.getCurrentUser.bind(authController));
router.post("/change-pin", authMiddleware, sensitiveLimiter, auditLog('PIN_CHANGE'), validate(changePinSchema), authController.changePin.bind(authController));

// SUPERADMIN-only routes
router.post("/admin/create", authMiddleware, roleMiddleware(['SUPERADMIN']), auditLog('ADMIN_CREATE'), validate(createAdminSchema), authController.createAdmin.bind(authController));
router.get("/admin/list", authMiddleware, roleMiddleware(['SUPERADMIN']), authController.listAdmins.bind(authController));
router.delete("/admin/:adminId", authMiddleware, roleMiddleware(['SUPERADMIN']), auditLog('ADMIN_DELETE'), authController.deleteAdmin.bind(authController));
router.get("/system/overview", authMiddleware, roleMiddleware(['SUPERADMIN']), authController.getSystemOverview.bind(authController));

// ADMIN-only routes (per-group admin check is done in the service layer)
router.post("/member/add", authMiddleware, memberAddLimiter, auditLog('MEMBER_ADD'), validate(addMemberSchema), authController.addMember.bind(authController));

// SUPERADMIN-only: Remove a member from a group
import { MemberController } from '../controllers/member.controller';
const memberController = new MemberController();
router.delete("/member/:id", authMiddleware, roleMiddleware(['SUPERADMIN']), auditLog('MEMBER_REMOVE'), memberController.removeMember.bind(memberController));

export default router;
