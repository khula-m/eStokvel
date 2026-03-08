import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CacheHelper, TransactionType, TransactionStatus, PaymentMethod } from '@estokvel/shared';
import type { Logger } from 'winston';

export function transactionRoutes(
  prisma: PrismaClient,
  cache: CacheHelper,
  logger: Logger,
  getReader: () => PrismaClient = () => prisma,
): Router {
  const router = Router();

  function generateRef(): string {
    return `STK-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
  }

  function toNum(v: any): number { return Number(v || 0); }

  async function invalidateGroupCaches(groupId: string) {
    await cache.invalidate(`cache:group:${groupId}*`);
  }

  // ── POST /  — Create transaction (SUPERADMIN or group ADMIN) ──
  router.post('/', async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const data = req.body;
      if (!data.stokvelGroupId || !data.transactionType || !data.amount || !data.paymentMethod) {
        return res.status(400).json({ success: false, message: 'stokvelGroupId, transactionType, amount, and paymentMethod are required' });
      }
      if (!Object.values(TransactionType).includes(data.transactionType)) {
        return res.status(400).json({ success: false, message: `Invalid transaction type. Valid: ${Object.values(TransactionType).join(', ')}` });
      }
      if (!Object.values(PaymentMethod).includes(data.paymentMethod)) {
        return res.status(400).json({ success: false, message: `Invalid payment method. Valid: ${Object.values(PaymentMethod).join(', ')}` });
      }

      const group = await prisma.stokvelGroup.findUnique({ where: { id: data.stokvelGroupId } });
      if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

      const recorderMembership = await prisma.member.findFirst({ where: { userId, stokvelGroupId: data.stokvelGroupId } });
      if (!recorderMembership) return res.status(403).json({ success: false, message: 'You are not a member of this group' });
      if (recorderMembership.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Only the group admin can record transactions' });

      let resolvedMemberId = data.memberId;
      if (resolvedMemberId) {
        const member = await prisma.member.findUnique({ where: { id: resolvedMemberId } });
        if (!member || member.stokvelGroupId !== data.stokvelGroupId) {
          return res.status(400).json({ success: false, message: 'Member not found in this group' });
        }
      } else {
        resolvedMemberId = recorderMembership.id;
      }

      const transaction = await prisma.transaction.create({
        data: {
          stokvelGroupId: data.stokvelGroupId,
          memberId: resolvedMemberId,
          transactionType: data.transactionType,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          referenceNumber: data.referenceNumber || generateRef(),
          recordedById: userId,
          currency: data.currency || group.currency,
          transactionDate: data.transactionDate || new Date(),
          status: TransactionStatus.PENDING,
          notes: data.notes || null,
        },
        include: {
          group: { select: { id: true, name: true, currency: true } },
          member: { include: { user: { select: { id: true, fullName: true, phoneNumber: true } } } },
          recordedBy: { select: { id: true, fullName: true, phoneNumber: true } },
        },
      });

      await invalidateGroupCaches(data.stokvelGroupId);
      return res.status(201).json({ success: true, data: transaction, message: 'Transaction created successfully' });
    } catch (error: any) {
      logger.error('Create transaction error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ── POST /contribute  — Member self-contribution ──
  router.post('/contribute', async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const { stokvelGroupId, amount, paymentMethod, notes } = req.body;
      if (!stokvelGroupId || !amount) return res.status(400).json({ success: false, message: 'stokvelGroupId and amount are required' });
      if (!paymentMethod) return res.status(400).json({ success: false, message: 'paymentMethod is required' });

      const result = await prisma.$transaction(async (tx: any) => {
        const group = await tx.stokvelGroup.findUnique({ where: { id: stokvelGroupId } });
        if (!group) throw new Error('Group not found');

        const membership = await tx.member.findFirst({ where: { userId, stokvelGroupId } });
        if (!membership) throw new Error('You are not a member of this group');

        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) throw new Error('Amount must be greater than 0');

        const transaction = await tx.transaction.create({
          data: {
            stokvelGroupId,
            memberId: membership.id,
            transactionType: TransactionType.CONTRIBUTION,
            amount: parsedAmount,
            paymentMethod: Object.values(PaymentMethod).includes(paymentMethod) ? paymentMethod : PaymentMethod.BANK_TRANSFER,
            notes: notes || undefined,
            referenceNumber: generateRef(),
            recordedById: userId,
            currency: group.currency,
            transactionDate: new Date(),
            status: TransactionStatus.COMPLETED,
          },
          include: {
            group: { select: { id: true, name: true, currency: true } },
            member: { include: { user: { select: { id: true, fullName: true, phoneNumber: true } } } },
            recordedBy: { select: { id: true, fullName: true, phoneNumber: true } },
          },
        });
        return transaction;
      }, { timeout: 10000 });

      await invalidateGroupCaches(stokvelGroupId);
      return res.status(201).json({ success: true, data: result, message: 'Contribution recorded successfully' });
    } catch (error: any) {
      logger.error('Contribute error:', error);
      return res.status(400).json({ success: false, message: error.message || 'Failed to record contribution' });
    }
  });

  // ── GET /  — List transactions (SUPERADMIN sees all, members see own groups) ──
  router.get('/', async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const { stokvelGroupId, memberId, transactionType, status, paymentMethod, startDate, endDate, minAmount, maxAmount, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = Math.min(parseInt(limit as string, 10), 100);
      const skip = (pageNum - 1) * limitNum;

      const whereClause: any = {};
      if (stokvelGroupId) whereClause.stokvelGroupId = stokvelGroupId;
      if (memberId) whereClause.memberId = memberId;
      if (transactionType) whereClause.transactionType = transactionType;
      if (status) whereClause.status = status;
      if (paymentMethod) whereClause.paymentMethod = paymentMethod;
      if (startDate || endDate) {
        whereClause.transactionDate = {};
        if (startDate) whereClause.transactionDate.gte = new Date(startDate as string);
        if (endDate) whereClause.transactionDate.lte = new Date(endDate as string);
      }
      if (minAmount || maxAmount) {
        whereClause.amount = {};
        if (minAmount) whereClause.amount.gte = parseFloat(minAmount as string);
        if (maxAmount) whereClause.amount.lte = parseFloat(maxAmount as string);
      }

      // Non-SUPERADMIN: restrict to groups where user is a member
      const reader = getReader();
      if (userRole !== 'SUPERADMIN') {
        const memberships = await reader.member.findMany({ where: { userId }, select: { stokvelGroupId: true, id: true, role: true } });
        if (memberships.length === 0) return res.json({ success: true, data: { transactions: [], pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 } } });

        const adminGroupIds = memberships.filter((m: any) => m.role === 'ADMIN').map((m: any) => m.stokvelGroupId);
        const memberIds = memberships.filter((m: any) => m.role === 'MEMBER').map((m: any) => m.id);

        if (adminGroupIds.length > 0 && memberIds.length > 0) {
          whereClause.OR = [{ stokvelGroupId: { in: adminGroupIds } }, { memberId: { in: memberIds } }];
        } else if (adminGroupIds.length > 0) {
          if (!whereClause.stokvelGroupId) whereClause.stokvelGroupId = { in: adminGroupIds };
        } else {
          whereClause.memberId = { in: memberIds };
        }
      }

      const [transactions, total, summary] = await Promise.all([
        reader.transaction.findMany({
          where: whereClause,
          include: {
            group: { select: { id: true, name: true, currency: true } },
            member: { include: { user: { select: { id: true, fullName: true, phoneNumber: true } } } },
            recordedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { transactionDate: 'desc' },
          skip,
          take: limitNum,
        }),
        reader.transaction.count({ where: whereClause }),
        reader.transaction.aggregate({ where: whereClause, _sum: { amount: true }, _avg: { amount: true }, _count: { _all: true } }),
      ]);

      return res.json({
        success: true,
        data: {
          transactions,
          pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum), hasNext: pageNum * limitNum < total, hasPrev: pageNum > 1 },
          summary: { totalAmount: toNum(summary._sum.amount), averageAmount: toNum(summary._avg.amount), count: summary._count._all },
        },
      });
    } catch (error: any) {
      logger.error('Get transactions error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ── GET /my  — Current user's transactions ──
  router.get('/my', async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const { stokvelGroupId, transactionType, status, startDate, endDate, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = Math.min(parseInt(limit as string, 10), 100);
      const skip = (pageNum - 1) * limitNum;

      const reader = getReader();
      const memberships = await reader.member.findMany({ where: { userId }, select: { id: true, stokvelGroupId: true } });
      const memberIds = memberships.map((m: any) => m.id);

      const whereClause: any = { memberId: { in: memberIds } };
      if (stokvelGroupId) whereClause.stokvelGroupId = stokvelGroupId;
      if (transactionType) whereClause.transactionType = transactionType;
      if (status) whereClause.status = status;
      if (startDate || endDate) {
        whereClause.transactionDate = {};
        if (startDate) whereClause.transactionDate.gte = new Date(startDate as string);
        if (endDate) whereClause.transactionDate.lte = new Date(endDate as string);
      }

      const [transactions, total] = await Promise.all([
        reader.transaction.findMany({
          where: whereClause,
          include: {
            group: { select: { id: true, name: true, currency: true } },
            member: { include: { user: { select: { id: true, fullName: true, phoneNumber: true } } } },
            recordedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { transactionDate: 'desc' },
          skip,
          take: limitNum,
        }),
        reader.transaction.count({ where: whereClause }),
      ]);

      return res.json({
        success: true,
        data: { transactions, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum), hasNext: pageNum * limitNum < total, hasPrev: pageNum > 1 } },
      });
    } catch (error: any) {
      logger.error('Get my transactions error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ── GET /dashboard/:groupId  — Dashboard data ──
  router.get('/dashboard/:groupId', async (req: any, res: Response) => {
    try {
      const groupId = String(req.params.groupId);
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const reader = getReader();
      const group = await reader.stokvelGroup.findUnique({
        where: { id: groupId },
        select: { id: true, name: true, _count: { select: { members: true } } },
      });
      if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

      const membership = await reader.member.findFirst({ where: { userId, stokvelGroupId: groupId } });
      if (!membership) return res.status(403).json({ success: false, message: 'You are not a member of this group' });

      const [contributionAgg, payoutAgg] = await Promise.all([
        reader.transaction.aggregate({ where: { stokvelGroupId: groupId, transactionType: 'CONTRIBUTION', status: 'COMPLETED' }, _sum: { amount: true } }),
        reader.transaction.aggregate({ where: { stokvelGroupId: groupId, transactionType: 'PAYOUT', status: 'COMPLETED' }, _sum: { amount: true } }),
      ]);

      return res.json({
        success: true,
        data: {
          groupName: group.name,
          totalMembers: group._count.members,
          totalContributions: toNum(contributionAgg._sum.amount),
          totalWithdrawals: toNum(payoutAgg._sum.amount),
        },
      });
    } catch (error: any) {
      logger.error('Get dashboard data error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ── GET /:id  — Get single transaction ──
  router.get('/:id', async (req: any, res: Response) => {
    try {
      const id = String(req.params.id);
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const reader = getReader();
      const transaction = await reader.transaction.findUnique({
        where: { id },
        include: {
          group: { select: { id: true, name: true, currency: true } },
          member: { include: { user: { select: { id: true, fullName: true, phoneNumber: true } } } },
          recordedBy: { select: { id: true, fullName: true, phoneNumber: true } },
        },
      });
      if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

      const membership = await reader.member.findFirst({ where: { userId, stokvelGroupId: transaction.stokvelGroupId } });
      if (!membership) return res.status(403).json({ success: false, message: 'You do not have access to this transaction' });

      return res.json({ success: true, data: transaction, message: 'Transaction retrieved successfully' });
    } catch (error: any) {
      logger.error('Get transaction error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ── PUT /:id  — Update transaction ──
  router.put('/:id', async (req: any, res: Response) => {
    try {
      const id = String(req.params.id);
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const transaction = await prisma.transaction.findUnique({ where: { id } });
      if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

      const membership = await prisma.member.findFirst({ where: { userId, stokvelGroupId: transaction.stokvelGroupId } });
      const isRecorder = transaction.recordedById === userId;
      if (!membership && !isRecorder) return res.status(403).json({ success: false, message: 'No permission to update this transaction' });
      if (membership && membership.role !== 'ADMIN' && !isRecorder) return res.status(403).json({ success: false, message: 'Only the admin can update transactions' });

      const updated = await prisma.transaction.update({
        where: { id },
        data: req.body,
        include: {
          group: { select: { id: true, name: true } },
          member: { include: { user: { select: { fullName: true } } } },
        },
      });

      await invalidateGroupCaches(transaction.stokvelGroupId);
      return res.json({ success: true, data: updated, message: 'Transaction updated successfully' });
    } catch (error: any) {
      logger.error('Update transaction error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  return router;
}
