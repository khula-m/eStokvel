import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { roleMiddleware } from "../middleware/role.middleware";
import { authRateLimiter, superadminRateLimiter } from "../middleware/rateLimiter.middleware";
import { sensitiveLimiter, memberAddLimiter } from "../middleware/security.middleware";
import { auditLog } from "../middleware/audit.middleware";
import { totpService } from "../services/totp.service";
import {
  validate,
  loginSchema,
  superadminLoginSchema,
  changePinSchema,
  createAdminSchema,
  addMemberSchema,
  forgotPinRequestSchema,
  forgotPinVerifySchema,
  forgotPinResetSchema,
  adminRegisterSchema,
  submitIdSchema,
} from "../middleware/zodValidation.middleware";

const router = Router();
const authController = new AuthController();

// Public routes - Mobile PIN login (ADMIN + MEMBER only)
router.post("/login", authRateLimiter, validate(loginSchema), authController.login.bind(authController));

// Public routes - Superadmin web portal login (email + password)
router.post("/superadmin/login", superadminRateLimiter, validate(superadminLoginSchema), authController.superadminLogin.bind(authController));

// Public routes - Forgot PIN flow (rate limited)
router.post("/forgot-pin/request", authRateLimiter, validate(forgotPinRequestSchema), authController.forgotPinRequest.bind(authController));
router.post("/forgot-pin/verify", authRateLimiter, validate(forgotPinVerifySchema), authController.forgotPinVerify.bind(authController));
router.post("/forgot-pin/reset", authRateLimiter, validate(forgotPinResetSchema), authController.forgotPinReset.bind(authController));

// Public routes - Admin self-registration
router.post("/admin/register", authRateLimiter, validate(adminRegisterSchema), authController.adminRegister.bind(authController));

// Protected routes (any authenticated user)
router.get("/me", authMiddleware, authController.getCurrentUser.bind(authController));
router.post("/change-pin", authMiddleware, sensitiveLimiter, auditLog('PIN_CHANGE'), validate(changePinSchema), authController.changePin.bind(authController));
router.post("/submit-id", authMiddleware, sensitiveLimiter, auditLog('ID_SUBMIT'), validate(submitIdSchema), authController.submitId.bind(authController));

// SUPERADMIN-only routes
router.post("/admin/create", authMiddleware, roleMiddleware(['SUPERADMIN']), auditLog('ADMIN_CREATE'), validate(createAdminSchema), authController.createAdmin.bind(authController));
router.get("/admin/list", authMiddleware, roleMiddleware(['SUPERADMIN']), authController.listAdmins.bind(authController));
router.get("/member/list", authMiddleware, roleMiddleware(['SUPERADMIN']), authController.listMembers.bind(authController));
router.delete("/admin/:adminId", authMiddleware, roleMiddleware(['SUPERADMIN']), auditLog('ADMIN_DELETE'), authController.deleteAdmin.bind(authController));
router.get("/system/overview", authMiddleware, roleMiddleware(['SUPERADMIN']), authController.getSystemOverview.bind(authController));

// ADMIN-only routes (per-group admin check is done in the service layer)
router.post("/member/add", authMiddleware, memberAddLimiter, auditLog('MEMBER_ADD'), validate(addMemberSchema), authController.addMember.bind(authController));

// SUPERADMIN TOTP 2FA setup — must be authenticated as SUPERADMIN
router.post(
  '/superadmin/totp/setup',
  authMiddleware,
  roleMiddleware(['SUPERADMIN']),
  sensitiveLimiter,
  auditLog('SUPERADMIN_TOTP_SETUP'),
  async (req, res) => {
    const result = await totpService.setupTotp((req as any).user!.id);
    return res.status(result.success ? 200 : 400).json(result);
  }
);

router.post(
  '/superadmin/totp/verify',
  authMiddleware,
  roleMiddleware(['SUPERADMIN']),
  sensitiveLimiter,
  auditLog('SUPERADMIN_TOTP_ENABLE'),
  async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'token is required' });
    const result = await totpService.verifyAndEnable((req as any).user!.id, String(token));
    return res.status(result.success ? 200 : 400).json(result);
  }
);

// SUPERADMIN-only: Remove a member from a group
import { MemberController } from '../controllers/member.controller';
const memberController = new MemberController();
router.delete("/member/:id", authMiddleware, roleMiddleware(['SUPERADMIN']), auditLog('MEMBER_REMOVE'), memberController.removeMember.bind(memberController));

export default router;
