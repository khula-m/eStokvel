import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { dashboardController } from '../controllers/dashboard.controller';

const router = Router();

// ALL routes require SUPERADMIN authentication
router.use(authMiddleware, roleMiddleware(['SUPERADMIN']));

// Audit logs
router.get(
  '/audit-logs',
  dashboardController.getAuditLogs.bind(dashboardController)
);

// Scheduler status
router.get(
  '/scheduler-status',
  dashboardController.getSchedulerStatus.bind(dashboardController)
);

export default router;
