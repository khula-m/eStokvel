import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CacheHelper, MemberRole } from '@estokvel/shared';
import type { Logger } from 'winston';

export function memberRoutes(
  prisma: PrismaClient,
  cache: CacheHelper,
  logger: Logger,
  getReader: () => PrismaClient = () => prisma,
): Router {
  const router = Router();

  // ── Helper: invalidate caches ──
  async function invalidateCaches(groupId: string, userId?: string) {
    await cache.invalidate(`cache:group:${groupId}*`);
    await cache.invalidate('cache:groups:all*');
    if (userId) await cache.invalidate(`cache:user:${userId}:groups*`);
  }

  // ────────────────────────────────────────
  // POST /  — Add member to a group
  // ────────────────────────────────────────
  router.post('/', async (req: any, res: Response) => {
    try {
      const invitedById = req.user?.id;
      if (!invitedById) return res.status(401).json({ success: false, message: 'Authentication required' });

      const { userId, stokvelGroupId, role } = req.body;
      if (!userId || !stokvelGroupId) {
        return res.status(400).json({ success: false, message: 'userId and stokvelGroupId are required' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const group = await prisma.stokvelGroup.findUnique({ where: { id: stokvelGroupId } });
      if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

      const existing = await prisma.member.findUnique({
        where: { userId_stokvelGroupId: { userId, stokvelGroupId } },
      });
      if (existing) return res.status(400).json({ success: false, message: 'User is already a member of this group' });

      const roleValue = role && Object.values(MemberRole).includes(role as MemberRole)
        ? (role as MemberRole) : MemberRole.MEMBER;

      const result = await prisma.$transaction(async (tx: any) => {
        let payoutOrder: number | undefined;
        if (group.payoutModel === 'ROTATING') {
          const maxOrder = await tx.member.aggregate({
            where: { stokvelGroupId },
            _max: { nextPayoutOrder: true },
          });
          payoutOrder = (maxOrder._max.nextPayoutOrder || 0) + 1;
        }

        const member = await tx.member.create({
          data: {
            userId,
            stokvelGroupId,
            role: roleValue,
            ...(payoutOrder !== undefined && { nextPayoutOrder: payoutOrder }),
          },
          include: {
            user: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
            group: { select: { id: true, name: true, code: true } },
          },
        });

        await tx.transaction.create({
          data: {
            stokvelGroupId,
            memberId: member.id,
            transactionType: 'ADJUSTMENT',
            amount: 0,
            currency: group.currency,
            paymentMethod: 'BANK_TRANSFER',
            transactionDate: new Date(),
            recordedById: invitedById,
            status: 'COMPLETED',
            notes: `${user.fullName} joined the group`,
          },
        });

        return member;
      });

      await invalidateCaches(stokvelGroupId, userId);
      return res.status(201).json({ success: true, data: result, message: 'Member added successfully' });
    } catch (error: any) {
      logger.error('Add member error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ────────────────────────────────────────
  // GET /:id  — Get member by ID
  // ────────────────────────────────────────
  router.get('/:id', async (req: any, res: Response) => {
    try {
      const id = String(req.params.id);
      const member = await prisma.member.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, fullName: true, phoneNumber: true, email: true, createdAt: true } },
          group: { select: { id: true, name: true, code: true, currency: true, contributionAmount: true } },
          transactions: {
            take: 10,
            orderBy: { transactionDate: 'desc' },
            select: { id: true, transactionType: true, amount: true, transactionDate: true, status: true },
          },
        },
      });
      if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
      return res.json({ success: true, data: member, message: 'Member retrieved successfully' });
    } catch (error: any) {
      logger.error('Get member error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ────────────────────────────────────────
  // PUT /:id  — Update member role
  // ────────────────────────────────────────
  router.put('/:id', async (req: any, res: Response) => {
    try {
      const id = String(req.params.id);
      const { role, ...rest } = req.body;

      const roleValue = role && Object.values(MemberRole).includes(role as MemberRole)
        ? (role as MemberRole) : undefined;
      if (role && !roleValue) return res.status(400).json({ success: false, message: 'Invalid role' });

      const member = await prisma.member.update({
        where: { id },
        data: { ...rest, ...(roleValue ? { role: roleValue } : {}) },
        include: {
          user: { select: { id: true, fullName: true, phoneNumber: true } },
          group: { select: { id: true, name: true } },
        },
      });

      return res.json({ success: true, data: member, message: 'Member updated successfully' });
    } catch (error: any) {
      logger.error('Update member error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ────────────────────────────────────────
  // DELETE /:id  — Remove member (SUPERADMIN only)
  // ────────────────────────────────────────
  router.delete('/:id', async (req: any, res: Response) => {
    try {
      const id = String(req.params.id);
      const userId = req.user?.id;
      const userRole = req.user?.role;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });
      if (userRole !== 'SUPERADMIN') return res.status(403).json({ success: false, message: 'Only a superadmin can remove members' });

      const member = await prisma.member.findUnique({
        where: { id },
        include: { user: true, group: true },
      });
      if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

      const pendingCount = await prisma.transaction.count({ where: { memberId: id, status: 'PENDING' } });
      if (pendingCount > 0) return res.status(400).json({ success: false, message: 'Cannot remove member with pending transactions' });

      // Calculate contribution total for END_OF_TERM audit
      let memberContributionTotal = 0;
      if (member.group.payoutModel === 'END_OF_TERM') {
        const contrib = await prisma.transaction.aggregate({
          where: { memberId: id, stokvelGroupId: member.stokvelGroupId, transactionType: 'CONTRIBUTION', status: 'COMPLETED' },
          _sum: { amount: true },
        });
        memberContributionTotal = Number(contrib._sum.amount || 0);
      }

      await prisma.$transaction(async (tx: any) => {
        const removalNote = member.group.payoutModel === 'END_OF_TERM' && memberContributionTotal > 0
          ? `${member.user.fullName} removed from END_OF_TERM group. R${memberContributionTotal.toFixed(2)} remains in pool for distribution at term end.`
          : `${member.user.fullName} was removed from the group`;

        await tx.transaction.create({
          data: {
            stokvelGroupId: member.stokvelGroupId,
            memberId: id,
            transactionType: 'ADJUSTMENT',
            amount: memberContributionTotal,
            currency: member.group.currency,
            paymentMethod: 'BANK_TRANSFER',
            transactionDate: new Date(),
            recordedById: userId,
            status: 'COMPLETED',
            notes: removalNote,
          },
        });

        await tx.member.delete({ where: { id } });

        // Resequence payout order for ROTATING groups
        if (member.group.payoutModel === 'ROTATING') {
          const remaining = await tx.member.findMany({
            where: { stokvelGroupId: member.stokvelGroupId },
            orderBy: { nextPayoutOrder: 'asc' },
          });
          for (let i = 0; i < remaining.length; i++) {
            await tx.member.update({ where: { id: remaining[i].id }, data: { nextPayoutOrder: i + 1 } });
          }
        }
      });

      await invalidateCaches(member.stokvelGroupId, member.user.id);

      const message = member.group.payoutModel === 'END_OF_TERM' && memberContributionTotal > 0
        ? `Member removed. R${memberContributionTotal.toFixed(2)} remains in pool until term end.`
        : 'Member removed successfully';
      return res.json({ success: true, message });
    } catch (error: any) {
      logger.error('Remove member error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ────────────────────────────────────────
  // GET /:id/stats  — Member statistics
  // ────────────────────────────────────────
  router.get('/:id/stats', async (req: any, res: Response) => {
    try {
      const memberId = String(req.params.id);
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        include: {
          user: { select: { fullName: true } },
          group: { select: { name: true, contributionAmount: true, contributionFrequency: true } },
        },
      });
      if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

      const [contributionAgg, payoutAgg, pendingAgg, totalCount, lastContribution, recentTransactions] = await Promise.all([
        prisma.transaction.aggregate({ where: { memberId, transactionType: 'CONTRIBUTION' }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { memberId, transactionType: 'PAYOUT' }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { memberId, transactionType: 'CONTRIBUTION', status: 'PENDING' }, _sum: { amount: true } }),
        prisma.transaction.count({ where: { memberId } }),
        prisma.transaction.findFirst({
          where: { memberId, transactionType: 'CONTRIBUTION' },
          orderBy: { transactionDate: 'desc' },
          select: { transactionDate: true },
        }),
        prisma.transaction.findMany({ where: { memberId }, orderBy: { transactionDate: 'desc' }, take: 5 }),
      ]);

      const totalContributions = Number(contributionAgg._sum.amount || 0);
      const totalPayouts = Number(payoutAgg._sum.amount || 0);

      return res.json({
        success: true,
        data: {
          member: { id: member.id, name: member.user.fullName, role: member.role, joinedAt: member.joinedAt },
          group: member.group,
          stats: {
            totalContributions,
            totalPayouts,
            currentBalance: totalContributions - totalPayouts,
            pendingAmount: Number(pendingAgg._sum.amount || 0),
            lastContributionDate: lastContribution?.transactionDate || null,
            totalTransactions: totalCount,
          },
          recentTransactions,
        },
        message: 'Member statistics retrieved successfully',
      });
    } catch (error: any) {
      logger.error('Get member stats error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ────────────────────────────────────────
  // POST /join  — Join group by invite code
  // ────────────────────────────────────────
  router.post('/join', async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      const { code } = req.body;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });
      if (!code) return res.status(400).json({ success: false, message: 'Group code is required' });

      const group = await prisma.stokvelGroup.findUnique({
        where: { code },
        include: { _count: { select: { members: true } } },
      });
      if (!group) return res.status(404).json({ success: false, message: 'Invalid group code' });
      if (!group.isActive) return res.status(400).json({ success: false, message: 'This group is no longer active' });

      const existing = await prisma.member.findUnique({
        where: { userId_stokvelGroupId: { userId, stokvelGroupId: group.id } },
      });
      if (existing) return res.status(400).json({ success: false, message: 'You are already a member of this group' });

      // Delegate to the add member flow (simplified — no payout order calc for code join)
      const member = await prisma.member.create({
        data: { userId, stokvelGroupId: group.id, role: MemberRole.MEMBER },
        include: {
          user: { select: { id: true, fullName: true, phoneNumber: true } },
          group: { select: { id: true, name: true, code: true } },
        },
      });

      await invalidateCaches(group.id, userId);
      return res.json({ success: true, data: member, message: 'Successfully joined group' });
    } catch (error: any) {
      logger.error('Join group with code error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ────────────────────────────────────────
  // GET /user/memberships  — Get user's memberships
  // ────────────────────────────────────────
  router.get('/user/memberships', async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const memberships = await prisma.member.findMany({
        where: { userId },
        include: {
          group: {
            select: { id: true, name: true, description: true, contributionAmount: true, contributionFrequency: true, currency: true, isActive: true, code: true },
          },
          user: { select: { id: true, fullName: true, phoneNumber: true } },
          _count: { select: { transactions: true } },
        },
      });

      return res.json({ success: true, data: memberships, message: `Found ${memberships.length} memberships` });
    } catch (error: any) {
      logger.error('Get user memberships error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  return router;
}
