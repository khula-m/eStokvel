import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'winston';
import type { CacheHelper } from '@estokvel/shared';
import { getSchedulerStatus, processPayouts } from '../jobs/payout.job';

export function payoutRoutes(prisma: PrismaClient, cache: CacheHelper, logger: Logger): Router {
  const router = Router();

  // ── GET /status — scheduler status (any authenticated user) ──
  router.get('/status', async (_req, res, next) => {
    try {
      const status = getSchedulerStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  });

  // ── POST /trigger — manual trigger (SUPERADMIN only) ──
  router.post('/trigger', async (req, res, next) => {
    try {
      const user = (req as any).user;
      if (user?.role !== 'SUPERADMIN') {
        res.status(403).json({ success: false, message: 'Only SUPERADMIN can manually trigger payouts' });
        return;
      }

      const status = getSchedulerStatus();
      if (status.isProcessing) {
        res.status(409).json({ success: false, message: 'Payout processing is already running' });
        return;
      }

      // Run asynchronously — don't block the response
      processPayouts(prisma, logger).catch(err =>
        logger.error('[PayoutAPI] Manual trigger error:', err)
      );

      res.json({ success: true, message: 'Payout processing triggered. Check /status for results.' });
    } catch (error) {
      next(error);
    }
  });

  // ── GET /history/:groupId — payout history for a group ──
  router.get('/history/:groupId', async (req, res, next) => {
    try {
      const { groupId } = req.params;
      const user = (req as any).user;

      // Verify membership (SUPERADMIN can see all)
      if (user?.role !== 'SUPERADMIN') {
        const membership = await (prisma as any).member.findFirst({
          where: { userId: user.id, stokvelGroupId: groupId },
        });
        if (!membership) {
          res.status(403).json({ success: false, message: 'You are not a member of this group' });
          return;
        }
      }

      const cacheKey = `cache:payouts:history:${groupId}`;
      const payouts = await cache.getOrSet(cacheKey, 120, async () => {
        return (prisma as any).transaction.findMany({
          where: {
            stokvelGroupId: groupId,
            transactionType: 'PAYOUT',
          },
          include: {
            member: {
              include: { user: { select: { fullName: true, phoneNumber: true } } },
            },
          },
          orderBy: { transactionDate: 'desc' },
        });
      });

      res.json({ success: true, data: payouts });
    } catch (error) {
      next(error);
    }
  });

  // ── GET /pending — all pending payouts (SUPERADMIN only) ──
  router.get('/pending', async (req, res, next) => {
    try {
      const user = (req as any).user;
      if (user?.role !== 'SUPERADMIN') {
        res.status(403).json({ success: false, message: 'Only SUPERADMIN can view all pending payouts' });
        return;
      }

      const pending = await (prisma as any).transaction.findMany({
        where: {
          transactionType: 'PAYOUT',
          status: 'PENDING',
        },
        include: {
          member: { include: { user: { select: { fullName: true } } } },
          group: { select: { name: true } },
        },
        orderBy: { transactionDate: 'desc' },
      });

      res.json({ success: true, data: pending, count: pending.length });
    } catch (error) {
      next(error);
    }
  });

  // ── GET /:payoutId — get specific payout transaction ──
  router.get('/:payoutId', async (req, res, next) => {
    try {
      const { payoutId } = req.params;
      const user = (req as any).user;

      const payout = await (prisma as any).transaction.findUnique({
        where: { id: payoutId },
        include: {
          member: { include: { user: { select: { fullName: true, phoneNumber: true } } } },
          group: { select: { name: true } },
        },
      });

      if (!payout || payout.transactionType !== 'PAYOUT') {
        res.status(404).json({ success: false, message: 'Payout not found' });
        return;
      }

      // Access check
      if (user?.role !== 'SUPERADMIN') {
        const membership = await (prisma as any).member.findFirst({
          where: { userId: user.id, stokvelGroupId: payout.stokvelGroupId },
        });
        if (!membership) {
          res.status(403).json({ success: false, message: 'Access denied' });
          return;
        }
      }

      res.json({ success: true, data: payout });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
