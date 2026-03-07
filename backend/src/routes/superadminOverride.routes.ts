import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { sensitiveLimiter } from '../middleware/security.middleware';
import { superAdminOverrideController } from '../controllers/superadminOverride.controller';

const router = Router();

// ALL routes require SUPERADMIN authentication
router.use(authMiddleware, roleMiddleware(['SUPERADMIN']));

// Apply sensitive rate limiter + audit log to all override routes
router.use(sensitiveLimiter);

// ── Transaction Overrides ──
router.post(
  '/transaction/:id/status',
  auditLog('SUPERADMIN_TX_STATUS_OVERRIDE'),
  superAdminOverrideController.updateTransactionStatus.bind(superAdminOverrideController)
);

router.post(
  '/transaction/adjustment',
  auditLog('SUPERADMIN_ADJUSTMENT'),
  superAdminOverrideController.createAdjustment.bind(superAdminOverrideController)
);

// ── Payout Overrides ──
router.post(
  '/payout/retry/:transactionId',
  auditLog('SUPERADMIN_PAYOUT_RETRY'),
  superAdminOverrideController.retryPayout.bind(superAdminOverrideController)
);

// ── User/Admin Overrides ──
router.post(
  '/admin/reset-pin/:userId',
  auditLog('SUPERADMIN_PIN_RESET'),
  superAdminOverrideController.resetAdminPin.bind(superAdminOverrideController)
);

router.post(
  '/admin/unlock/:userId',
  auditLog('SUPERADMIN_ACCOUNT_UNLOCK'),
  superAdminOverrideController.unlockAccount.bind(superAdminOverrideController)
);

// ── Group Overrides ──
router.post(
  '/group/:groupId/transfer-admin',
  auditLog('SUPERADMIN_ADMIN_TRANSFER'),
  superAdminOverrideController.transferGroupAdmin.bind(superAdminOverrideController)
);

export default router;
