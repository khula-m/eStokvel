import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { Logger } from 'winston';

export function paymentRoutes(prisma: PrismaClient, logger: Logger): Router {
  const router = Router();

  // ── PUT /groups/:groupId/bank-details  — Update bank details (ADMIN only) ──
  router.put('/groups/:groupId/bank-details', async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      const groupId = String(req.params.groupId);
      const { bankName, accountNumber, accountHolder, branchCode } = req.body;

      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const membership = await prisma.member.findFirst({ where: { userId, stokvelGroupId: groupId } });
      if (!membership) return res.status(403).json({ success: false, message: 'You are not a member of this group' });
      if (membership.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Only group admins can update bank details' });

      if (!bankName || !accountNumber || !accountHolder) {
        return res.status(400).json({ success: false, message: 'Bank name, account number and account holder are required' });
      }

      const updatedGroup = await prisma.stokvelGroup.update({
        where: { id: groupId },
        data: { bankName, accountNumber, accountHolder, branchCode: branchCode || null },
        select: { id: true, name: true, bankName: true, accountNumber: true, accountHolder: true, branchCode: true },
      });

      return res.json({ success: true, data: updatedGroup, message: 'Bank details updated successfully' });
    } catch (error: any) {
      logger.error('Update bank details error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update bank details' });
    }
  });

  // ── GET /groups/:groupId/bank-details  — Get bank details ──
  router.get('/groups/:groupId/bank-details', async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      const groupId = String(req.params.groupId);
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const membership = await prisma.member.findFirst({ where: { userId, stokvelGroupId: groupId } });
      if (!membership) return res.status(403).json({ success: false, message: 'You are not a member of this group' });

      const group = await prisma.stokvelGroup.findUnique({
        where: { id: groupId },
        select: { id: true, name: true, bankName: true, accountNumber: true, accountHolder: true, branchCode: true },
      });
      if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

      // Mask account number for non-admins
      const data = {
        ...group,
        accountNumber: membership.role === 'ADMIN'
          ? group.accountNumber
          : group.accountNumber ? `****${group.accountNumber.slice(-4)}` : null,
      };

      return res.json({ success: true, data });
    } catch (error: any) {
      logger.error('Get bank details error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get bank details' });
    }
  });

  // ── PUT /transactions/:transactionId/verify  — Verify payment (ADMIN only) ──
  router.put('/transactions/:transactionId/verify', async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      const transactionId = String(req.params.transactionId);
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
      if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

      const membership = await prisma.member.findFirst({ where: { userId, stokvelGroupId: transaction.stokvelGroupId } });
      if (!membership || membership.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only group admins can verify payments' });
      }

      const updated = await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'COMPLETED' },
        include: {
          member: { include: { user: { select: { fullName: true, phoneNumber: true } } } },
          group: { select: { id: true, name: true } },
        },
      });

      return res.json({ success: true, data: updated, message: 'Payment verified successfully' });
    } catch (error: any) {
      logger.error('Verify payment error:', error);
      return res.status(500).json({ success: false, message: 'Failed to verify payment' });
    }
  });

  // ── GET /groups/:groupId/pending  — Pending payments (ADMIN only) ──
  router.get('/groups/:groupId/pending', async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      const groupId = String(req.params.groupId);
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const membership = await prisma.member.findFirst({ where: { userId, stokvelGroupId: groupId } });
      if (!membership || membership.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only group admins can view pending payments' });
      }

      const pending = await prisma.transaction.findMany({
        where: { stokvelGroupId: groupId, status: 'PENDING' },
        include: {
          member: { include: { user: { select: { fullName: true, phoneNumber: true } } } },
        },
        orderBy: { transactionDate: 'desc' },
      });

      return res.json({ success: true, data: pending, message: `${pending.length} pending payment(s)` });
    } catch (error: any) {
      logger.error('Get pending payments error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get pending payments' });
    }
  });

  return router;
}
