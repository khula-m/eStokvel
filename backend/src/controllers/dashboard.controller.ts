import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { getSchedulerStatus } from '../jobs/payout.job';
import logger from '../utils/logger';

/**
 * Dashboard Controller
 * Provides audit log retrieval and scheduler status for the admin dashboard.
 */
export class DashboardController {

  /**
   * GET /api/superadmin/audit-logs
   * Retrieve paginated audit logs with optional filters.
   */
  async getAuditLogs(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const action = (req.query.action as string) || undefined;
      const userId = (req.query.userId as string) || undefined;
      const result = (req.query.result as string) || undefined;
      const from = (req.query.from as string) || undefined;
      const to = (req.query.to as string) || undefined;

      const where: any = {};

      if (action) where.action = { contains: action, mode: 'insensitive' };
      if (userId) where.userId = userId;
      if (result) where.result = result;
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return res.json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      logger.error('Dashboard getAuditLogs error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * GET /api/superadmin/scheduler-status
   * Return current payout scheduler status + DB stats.
   */
  async getSchedulerStatus(_req: Request, res: Response) {
    try {
      const status = getSchedulerStatus();

      // Get additional DB stats
      const [pendingPayouts, failedPayouts, activeRotatingGroups, activeEndOfTermGroups] = await Promise.all([
        prisma.transaction.count({ where: { transactionType: 'PAYOUT', status: 'PENDING' } }),
        prisma.transaction.count({ where: { transactionType: 'PAYOUT', status: 'FAILED' } }),
        prisma.stokvelGroup.count({ where: { isActive: true, payoutModel: 'ROTATING' } }),
        prisma.stokvelGroup.count({ where: { isActive: true, payoutModel: 'END_OF_TERM' } }),
      ]);

      return res.json({
        success: true,
        data: {
          ...status,
          pendingPayouts,
          failedPayouts,
          activeRotatingGroups,
          activeEndOfTermGroups,
        },
      });
    } catch (error: any) {
      logger.error('Dashboard getSchedulerStatus error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

export const dashboardController = new DashboardController();
