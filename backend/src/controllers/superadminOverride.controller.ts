import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import { TransactionStatus } from '../utils/enums';

/**
 * SuperAdmin Override Controller
 * 
 * Provides manual override tools for recovery scenarios:
 * - Mark transaction complete/failed
 * - Retry failed payout
 * - Create adjustment transaction
 * - Reset admin PIN
 * - Transfer group admin role
 */
export class SuperAdminOverrideController {

  /**
   * POST /api/superadmin/override/transaction/:id/status
   * Manually update a transaction's status (e.g., mark COMPLETED if webhook lost)
   */
  async updateTransactionStatus(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const status = String(req.body.status);
      const reason = String(req.body.reason || '');
      const userId = (req as any).user?.id;

      if (!['COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status. Must be COMPLETED, FAILED, CANCELLED, or REVERSED.' });
      }

      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ success: false, message: 'A reason (min 5 chars) is required for manual override.' });
      }

      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          member: { include: { user: { select: { fullName: true } } } },
          group: { select: { name: true } },
        },
      });

      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      const previousStatus = transaction.status;

      await prisma.transaction.update({
        where: { id },
        data: {
          status: status as TransactionStatus,
          paidAt: status === 'COMPLETED' ? new Date() : undefined,
          notes: `${transaction.notes || ''}\n[SUPERADMIN OVERRIDE by ${userId}] ${previousStatus} → ${status}: ${reason}` as string,
        },
      });

      logger.warn(`[AUDIT][SUPERADMIN_OVERRIDE] Transaction ${id} status changed: ${previousStatus} → ${status}. Reason: ${reason}. By: ${userId}`);

      return res.json({
        success: true,
        message: `Transaction ${id} updated from ${previousStatus} to ${status}`,
        data: { transactionId: id, previousStatus, newStatus: status, reason },
      });
    } catch (error: any) {
      logger.error('SuperAdmin updateTransactionStatus error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * POST /api/superadmin/override/transaction/adjustment
   * Create an adjustment transaction (correct balances, handle overpayments, etc.)
   */
  async createAdjustment(req: Request, res: Response) {
    try {
      const groupId = String(req.body.groupId || '');
      const memberId = String(req.body.memberId || '');
      const amount = req.body.amount;
      const reason = String(req.body.reason || '');
      const userId = (req as any).user?.id;

      if (!groupId || !memberId || amount === undefined || !reason) {
        return res.status(400).json({ success: false, message: 'groupId, memberId, amount, and reason are required.' });
      }
      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ success: false, message: 'A reason (min 5 chars) is required for adjustments.' });
      }

      const group = await prisma.stokvelGroup.findUnique({ where: { id: groupId }, select: { id: true, name: true, currency: true } });
      if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

      const member = await prisma.member.findUnique({
        where: { id: memberId },
        include: { user: { select: { fullName: true } } },
      });
      if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

      const transaction = await prisma.transaction.create({
        data: {
          stokvelGroupId: groupId,
          memberId: memberId,
          transactionType: 'ADJUSTMENT',
          amount: Math.abs(Number(amount)),
          currency: group.currency,
          paymentMethod: 'BANK_TRANSFER',
          transactionDate: new Date(),
          recordedById: userId,
          status: 'COMPLETED',
          referenceNumber: `ADJ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          notes: `[SUPERADMIN ADJUSTMENT by ${userId}] Amount: R${Number(amount).toFixed(2)} for ${member.user.fullName}. Reason: ${reason}`,
          source: 'SUPERADMIN_ADJUSTMENT',
        },
      });

      logger.warn(`[AUDIT][SUPERADMIN_ADJUSTMENT] Created adjustment ${transaction.id}: R${Number(amount).toFixed(2)} for member ${memberId} in group ${groupId}. Reason: ${reason}. By: ${userId}`);

      return res.json({
        success: true,
        message: `Adjustment of R${Math.abs(Number(amount)).toFixed(2)} created for ${member.user.fullName}`,
        data: { transactionId: transaction.id },
      });
    } catch (error: any) {
      logger.error('SuperAdmin createAdjustment error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * POST /api/superadmin/override/admin/reset-pin/:userId
   * Reset an admin's PIN (generates a temp PIN, SMS sent)
   */
  async resetAdminPin(req: Request, res: Response) {
    try {
      const userId = req.params.userId as string;
      const newPin = String(req.body.newPin || '');
      const superadminId = (req as any).user?.id;

      if (!newPin || newPin.length !== 5 || !/^\d{5}$/.test(newPin)) {
        return res.status(400).json({ success: false, message: 'New PIN must be exactly 5 digits.' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, phoneNumber: true, role: true },
      });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      if (user.role === 'SUPERADMIN') {
        return res.status(403).json({ success: false, message: 'Cannot reset SUPERADMIN PIN via this endpoint.' });
      }

      const hashedPin = await bcrypt.hash(newPin, 10);

      await prisma.user.update({
        where: { id: userId },
        data: {
          pin: hashedPin,
          failedAttempts: 0, // Reset lockout
          lockedUntil: null,
        },
      });

      logger.warn(`[AUDIT][SUPERADMIN_PIN_RESET] PIN reset for user ${userId} (${user.fullName}). By: ${superadminId}`);

      return res.json({
        success: true,
        message: `PIN reset successfully for ${user.fullName}. Please securely communicate the new PIN to the user.`,
      });
    } catch (error: any) {
      logger.error('SuperAdmin resetAdminPin error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * POST /api/superadmin/override/group/:groupId/transfer-admin
   * Transfer group admin role from one member to another
   */
  async transferGroupAdmin(req: Request, res: Response) {
    try {
      const groupId = req.params.groupId as string;
      const fromMemberId = String(req.body.fromMemberId || '');
      const toMemberId = String(req.body.toMemberId || '');
      const reason = String(req.body.reason || '');
      const superadminId = (req as any).user?.id;

      if (!fromMemberId || !toMemberId || !reason) {
        return res.status(400).json({ success: false, message: 'fromMemberId, toMemberId, and reason are required.' });
      }

      const group = await prisma.stokvelGroup.findUnique({
        where: { id: groupId },
        include: { members: { include: { user: { select: { fullName: true } } } } },
      });
      if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

      const fromMember = group.members.find((m: any) => m.id === fromMemberId);
      const toMember = group.members.find((m: any) => m.id === toMemberId);

      if (!fromMember) return res.status(404).json({ success: false, message: 'Current admin member not found in group' });
      if (!toMember) return res.status(404).json({ success: false, message: 'New admin member not found in group' });

      if (fromMember.role !== 'ADMIN') {
        return res.status(400).json({ success: false, message: `${fromMember.user.fullName} is not currently an admin` });
      }

      // Atomic transfer
      await prisma.$transaction([
        prisma.member.update({ where: { id: fromMemberId }, data: { role: 'MEMBER' } }),
        prisma.member.update({ where: { id: toMemberId }, data: { role: 'ADMIN' } }),
      ]);

      logger.warn(`[AUDIT][SUPERADMIN_ADMIN_TRANSFER] Group "${group.name}" (${groupId}) admin transferred: ${fromMember.user.fullName} → ${toMember.user.fullName}. Reason: ${reason}. By: ${superadminId}`);

      return res.json({
        success: true,
        message: `Admin role transferred from ${fromMember.user.fullName} to ${toMember.user.fullName}`,
        data: {
          groupId,
          previousAdmin: { id: fromMemberId, name: fromMember.user.fullName },
          newAdmin: { id: toMemberId, name: toMember.user.fullName },
        },
      });
    } catch (error: any) {
      logger.error('SuperAdmin transferGroupAdmin error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * POST /api/superadmin/override/payout/retry/:transactionId
   * Retry a failed payout transaction
   */
  async retryPayout(req: Request, res: Response) {
    try {
      const transactionId = req.params.transactionId as string;
      const superadminId = (req as any).user?.id;

      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          member: {
            include: { user: { select: { fullName: true, phoneNumber: true } } },
          },
          group: { select: { id: true, name: true, currency: true } },
        },
      });

      if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
      if (transaction.transactionType !== 'PAYOUT') {
        return res.status(400).json({ success: false, message: 'Only PAYOUT transactions can be retried' });
      }
      if (transaction.status === 'COMPLETED') {
        return res.status(400).json({ success: false, message: 'Payout already completed. Cannot retry.' });
      }

      if (!transaction.member.payoutBankName || !transaction.member.payoutAccountNumber) {
        return res.status(400).json({
          success: false,
          message: `${transaction.member.user.fullName} has no payout bank details. Update bank details first.`,
        });
      }

      // Reset the transaction to PENDING for re-processing
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'PENDING',
          ozowPaymentStatus: null,
          notes: `${transaction.notes || ''}\n[SUPERADMIN RETRY by ${superadminId}] Retrying failed payout.`,
        },
      });

      // Attempt payout via Ozow — dynamic import to avoid circular dependency
      const ozowModule = await import('../services/ozow.service');
      const result = await ozowModule.ozowService.initiatePayout({
        memberId: transaction.member.id,
        groupId: transaction.group.id,
        amount: Number(transaction.amount),
        reason: `Retry payout from ${transaction.group.name} (SuperAdmin override)`,
      });

      logger.warn(`[AUDIT][SUPERADMIN_PAYOUT_RETRY] Transaction ${transactionId} retry. Result: ${result.success ? 'initiated' : result.message}. By: ${superadminId}`);

      return res.json({
        success: result.success,
        message: result.success
          ? `Payout retry initiated for ${transaction.member.user.fullName}`
          : `Payout retry failed: ${result.message}`,
        data: { transactionId, retryResult: result },
      });
    } catch (error: any) {
      logger.error('SuperAdmin retryPayout error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * POST /api/superadmin/override/admin/unlock/:userId
   * Unlock a locked-out user account
   */
  async unlockAccount(req: Request, res: Response) {
    try {
      const userId = req.params.userId as string;
      const superadminId = (req as any).user?.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, failedAttempts: true, lockedUntil: true },
      });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      await prisma.user.update({
        where: { id: userId },
        data: { failedAttempts: 0, lockedUntil: null },
      });

      logger.warn(`[AUDIT][SUPERADMIN_UNLOCK] Account unlocked for ${user.fullName} (${userId}). Was locked with ${user.failedAttempts} failed attempts. By: ${superadminId}`);

      return res.json({
        success: true,
        message: `Account unlocked for ${user.fullName}. They can now login again.`,
      });
    } catch (error: any) {
      logger.error('SuperAdmin unlockAccount error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

export const superAdminOverrideController = new SuperAdminOverrideController();
