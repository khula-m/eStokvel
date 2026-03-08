import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'winston';
import { handleOzowPayoutNotification, handleOzowNotification } from '../jobs/ozow.client';

/**
 * Ozow webhook routes — no auth required (verified by hash/Ozow server-to-server).
 */
export function ozowRoutes(prisma: PrismaClient, logger: Logger): Router {
  const router = Router();

  // ── POST /notify — Ozow payment notification webhook ──
  router.post('/notify', async (req, res, next) => {
    try {
      const result = await handleOzowNotification(req.body, prisma, logger);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // ── POST /payout-notify — Ozow payout notification webhook ──
  router.post('/payout-notify', async (req, res, next) => {
    try {
      const result = await handleOzowPayoutNotification(req.body, prisma, logger);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // ── GET /success — payment success redirect ──
  router.get('/success', async (req, res, next) => {
    try {
      const transactionRef = req.query.TransactionReference as string || req.query.transactionReference as string;
      if (!transactionRef) {
        res.json({ success: false, message: 'No transaction reference provided' });
        return;
      }

      const transaction = await (prisma as any).transaction.findUnique({
        where: { id: transactionRef },
        select: { id: true, status: true, amount: true, group: { select: { name: true } } },
      });

      if (!transaction) {
        res.json({ success: false, message: 'Transaction not found' });
        return;
      }

      res.json({
        success: true,
        transactionId: transaction.id,
        status: transaction.status,
        message: `Payment of R ${Number(transaction.amount).toFixed(2)} to ${transaction.group.name} is being processed.`,
      });
    } catch (error) {
      next(error);
    }
  });

  // ── GET /error — payment error redirect ──
  router.get('/error', async (req, res) => {
    const transactionRef = req.query.TransactionReference as string;
    res.json({
      success: false,
      transactionId: transactionRef || null,
      message: 'Payment failed. Please try again.',
    });
  });

  // ── GET /cancel — payment cancel redirect ──
  router.get('/cancel', async (req, res, next) => {
    try {
      const transactionRef = req.query.TransactionReference as string || req.query.transactionReference as string;
      if (transactionRef) {
        const transaction = await (prisma as any).transaction.findUnique({
          where: { id: transactionRef },
          select: { id: true, status: true },
        });

        if (transaction && transaction.status === 'PENDING') {
          await (prisma as any).transaction.update({
            where: { id: transactionRef },
            data: { status: 'CANCELLED', ozowPaymentStatus: 'UserCancelled' },
          });
        }
      }

      res.json({
        success: false,
        transactionId: transactionRef || null,
        message: 'Payment was cancelled.',
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
