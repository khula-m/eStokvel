import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CacheHelper, MemberRole } from '@estokvel/shared';
import type { Logger } from 'winston';

export function groupRoutes(
  prisma: PrismaClient,
  cache: CacheHelper,
  logger: Logger,
  getReader: () => PrismaClient = () => prisma,
): Router {
  const router = Router();

  // ── Helper: generate unique 6-char group code ──
  async function generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    let isUnique = false;
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      const existing = await prisma.stokvelGroup.findUnique({ where: { code } });
      if (!existing) isUnique = true;
    }
    return code;
  }

  // ── Helper: invalidate group-related caches ──
  async function invalidateGroupCaches(groupId: string, userId?: string) {
    await cache.invalidate(`cache:group:${groupId}*`);
    await cache.invalidate('cache:groups:all*');
    if (userId) await cache.invalidate(`cache:user:${userId}:groups*`);
  }

  // ── Helper: get groupId from req ──
  function getGroupIdFromReq(req: Request): string | null {
    return (req.params as any).groupId || (req.params as any).id || null;
  }

  // ── Middleware: requireAdminRole for group ──
  async function requireAdminRole(req: any, res: Response, next: Function) {
    try {
      const userId = req.user?.id;
      const groupId = getGroupIdFromReq(req);
      if (!groupId) return res.status(400).json({ success: false, message: 'Group ID is required' });

      const membership = await prisma.member.findFirst({
        where: { userId, stokvelGroupId: groupId, role: 'ADMIN' },
      });
      if (!membership) return res.status(403).json({ success: false, message: 'Only group admins can perform this action' });

      req.membership = membership;
      next();
    } catch (error) {
      logger.error('Admin role check error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // ────────────────────────────────────────
  // POST /  — Create group
  // ────────────────────────────────────────
  router.post('/', async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });
      if (!req.body.name) return res.status(400).json({ success: false, message: 'Group name is required' });

      const data = req.body;
      const code = await generateUniqueCode();
      const startDate = new Date();
      const durationMonths = data.durationMonths || 12;
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + durationMonths);

      const group = await prisma.$transaction(async (tx: any) => {
        const newGroup = await tx.stokvelGroup.create({
          data: {
            ...data,
            code,
            createdById: userId,
            startDate,
            endDate,
            durationMonths,
            payoutModel: data.payoutModel || 'ROTATING',
          },
          include: {
            createdBy: { select: { id: true, fullName: true, phoneNumber: true } },
          },
        });
        await tx.member.create({
          data: { userId, stokvelGroupId: newGroup.id, role: MemberRole.ADMIN },
        });
        return newGroup;
      });

      await invalidateGroupCaches(group.id, userId);
      return res.status(201).json({ success: true, data: group, message: 'Stokvel group created successfully' });
    } catch (error: any) {
      logger.error('Create group error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ────────────────────────────────────────
  // GET /  — Get user's groups (SUPERADMIN sees all)
  // ────────────────────────────────────────
  router.get('/', async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      if (userRole === 'SUPERADMIN') {
        const groups: any[] = await cache.getOrSet('cache:groups:all', 30, () =>
          getReader().stokvelGroup.findMany({
            where: { isActive: true },
            include: {
              createdBy: { select: { id: true, fullName: true, phoneNumber: true } },
              _count: { select: { members: true, transactions: true } },
            },
            orderBy: { createdAt: 'desc' },
          })
        );
        return res.json({ success: true, data: groups, message: `Found ${groups.length} group(s)` });
      }

      const memberGroups: any[] = await cache.getOrSet(`cache:user:${userId}:groups`, 30, () =>
        getReader().member.findMany({
          where: { userId, group: { isActive: true } },
          include: {
            group: {
              include: {
                createdBy: { select: { id: true, fullName: true, phoneNumber: true } },
                _count: { select: { members: true, transactions: true } },
              },
            },
          },
        })
      );

      const groups = memberGroups.map((m: any) => ({
        ...m.group,
        userRole: m.role,
        isCreator: m.group.createdById === userId,
      }));

      return res.json({ success: true, data: groups, message: 'User groups retrieved successfully' });
    } catch (error: any) {
      logger.error('Get user groups error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ────────────────────────────────────────
  // GET /code/:code  — Get group by invite code
  // ────────────────────────────────────────
  router.get('/code/:code', async (req: any, res: Response) => {
    try {
      const code = String(req.params.code);
      const group = await cache.getOrSet(`cache:group:code:${code}`, 60, () =>
        getReader().stokvelGroup.findUnique({
          where: { code },
          include: {
            createdBy: { select: { id: true, fullName: true, phoneNumber: true } },
            _count: { select: { members: true } },
          },
        })
      );
      if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
      return res.json({ success: true, data: group, message: 'Group retrieved successfully' });
    } catch (error: any) {
      logger.error('Get group by code error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ────────────────────────────────────────
  // GET /:id  — Get group by ID
  // ────────────────────────────────────────
  router.get('/:id', async (req: any, res: Response) => {
    try {
      const id = String(req.params.id);
      const userId = req.user?.id;

      const group = await prisma.stokvelGroup.findUnique({
        where: { id },
        include: {
          createdBy: { select: { id: true, fullName: true, phoneNumber: true } },
          members: {
            include: {
              user: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
            },
          },
          _count: { select: { members: true, transactions: true } },
        },
      });

      if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

      let isMember = false;
      if (userId) {
        const membership = await prisma.member.findUnique({
          where: { userId_stokvelGroupId: { userId, stokvelGroupId: id } },
        });
        isMember = !!membership;
      }

      return res.json({ success: true, data: { ...group, isMember }, message: 'Group retrieved successfully' });
    } catch (error: any) {
      logger.error('Get group error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ────────────────────────────────────────
  // PUT /:id  — Update group (admin only)
  // ────────────────────────────────────────
  router.put('/:id', requireAdminRole, async (req: any, res: Response) => {
    try {
      const id = String(req.params.id);
      const data = req.body;

      // Prevent payout model change after contributions
      if (data.payoutModel) {
        const existingGroup = await prisma.stokvelGroup.findUnique({ where: { id } });
        if (existingGroup && existingGroup.payoutModel !== data.payoutModel) {
          const hasContributions = await prisma.transaction.count({
            where: { stokvelGroupId: id, transactionType: 'CONTRIBUTION', status: 'COMPLETED' },
          });
          if (hasContributions > 0) {
            return res.status(400).json({
              success: false,
              message: 'Cannot change payout model after contributions have been made.',
            });
          }
        }
      }

      const group = await prisma.stokvelGroup.update({
        where: { id },
        data,
        include: { createdBy: { select: { id: true, fullName: true, phoneNumber: true } } },
      });

      await invalidateGroupCaches(id);
      return res.json({ success: true, data: group, message: 'Group updated successfully' });
    } catch (error: any) {
      logger.error('Update group error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ────────────────────────────────────────
  // DELETE /:id  — Soft-delete group
  // ────────────────────────────────────────
  router.delete('/:id', async (req: any, res: Response) => {
    try {
      const id = String(req.params.id);
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const group = await prisma.stokvelGroup.findUnique({
        where: { id },
        include: { members: { select: { id: true, userId: true, role: true } } },
      });
      if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

      // Check group balance
      const [totalContrib, totalPayout] = await Promise.all([
        prisma.transaction.aggregate({
          where: { stokvelGroupId: id, transactionType: 'CONTRIBUTION', status: 'COMPLETED' },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { stokvelGroupId: id, transactionType: 'PAYOUT', status: { in: ['COMPLETED', 'PENDING'] } },
          _sum: { amount: true },
        }),
      ]);
      const groupBalance = Number(totalContrib._sum.amount || 0) - Number(totalPayout._sum.amount || 0);

      if (groupBalance > 0 && userRole !== 'SUPERADMIN') {
        return res.status(400).json({
          success: false,
          message: `Cannot delete group with remaining balance of R${groupBalance.toFixed(2)}. Funds must be distributed first.`,
        });
      }

      if (userRole === 'SUPERADMIN') {
        if (groupBalance > 0) logger.warn(`[AUDIT] SUPERADMIN deleting group "${group.name}" (${id}) with R${groupBalance.toFixed(2)} remaining`);
        await prisma.stokvelGroup.update({ where: { id }, data: { isActive: false } });
        await invalidateGroupCaches(id);
        return res.json({
          success: true,
          message: groupBalance > 0
            ? `Group deactivated by superadmin. WARNING: R${groupBalance.toFixed(2)} remaining balance.`
            : 'Group deactivated successfully by superadmin',
        });
      }

      // ADMIN: must be group admin
      const isGroupAdmin = group.members.some((m: any) => m.userId === userId && m.role === 'ADMIN');
      if (!isGroupAdmin) return res.status(403).json({ success: false, message: 'You are not authorized to delete this group' });

      // Check for non-admin members
      const nonAdminMembers = group.members.filter((m: any) => m.userId !== userId && m.role !== 'ADMIN');
      if (nonAdminMembers.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete group with ${nonAdminMembers.length} active member(s). Only a superadmin can delete groups that have members.`,
        });
      }

      await prisma.stokvelGroup.update({ where: { id }, data: { isActive: false } });
      await invalidateGroupCaches(id, userId);
      return res.json({ success: true, message: 'Group deactivated successfully' });
    } catch (error: any) {
      logger.error('Delete group error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ────────────────────────────────────────
  // POST /:id/join  — Join group by ID
  // ────────────────────────────────────────
  router.post('/:id/join', async (req: any, res: Response) => {
    try {
      const groupId = String(req.params.id);
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const group = await prisma.stokvelGroup.findUnique({ where: { id: groupId } });
      if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
      if (!group.isActive) return res.status(400).json({ success: false, message: 'Group is not active' });

      const existing = await prisma.member.findUnique({
        where: { userId_stokvelGroupId: { userId, stokvelGroupId: groupId } },
      });
      if (existing) return res.status(400).json({ success: false, message: 'Already a member of this group' });

      const member = await prisma.member.create({
        data: { userId, stokvelGroupId: groupId, role: MemberRole.MEMBER },
        include: {
          user: { select: { id: true, fullName: true, phoneNumber: true } },
          group: { select: { id: true, name: true, code: true } },
        },
      });

      await invalidateGroupCaches(groupId, userId);
      return res.json({ success: true, data: member, message: 'Successfully joined group' });
    } catch (error: any) {
      logger.error('Join group error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ────────────────────────────────────────
  // GET /:id/stats  — Group statistics (cached)
  // ────────────────────────────────────────
  router.get('/:id/stats', async (req: any, res: Response) => {
    try {
      const groupId = String(req.params.id);
      const userId = req.user?.id;
      const userRole = req.user?.role;

      // Check membership for non-admin users
      if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN') {
        const membership = await prisma.member.findUnique({
          where: { userId_stokvelGroupId: { userId, stokvelGroupId: groupId } },
        });
        if (!membership) return res.status(403).json({ success: false, message: 'You must be a member to view group statistics' });
      }

      const stats = await cache.getOrSet(`cache:group:${groupId}:stats`, 300, async () => {
        const reader = getReader();
        const memberCount = await reader.member.count({ where: { stokvelGroupId: groupId } });

        const [contributionAgg, payoutAgg] = await Promise.all([
          reader.transaction.aggregate({
            where: { stokvelGroupId: groupId, status: 'COMPLETED', transactionType: 'CONTRIBUTION' },
            _sum: { amount: true },
          }),
          reader.transaction.aggregate({
            where: { stokvelGroupId: groupId, status: 'COMPLETED', transactionType: 'PAYOUT' },
            _sum: { amount: true },
          }),
        ]);

        const totalContributions = Number(contributionAgg._sum.amount || 0);
        const totalPayouts = Number(payoutAgg._sum.amount || 0);
        const totalBalance = totalContributions - totalPayouts;
        const pendingCount = await reader.transaction.count({ where: { stokvelGroupId: groupId, status: 'PENDING' } });

        const group = await reader.stokvelGroup.findUnique({
          where: { id: groupId },
          select: { contributionAmount: true, contributionFrequency: true },
        });
        const monthlyTarget = Number(group?.contributionAmount || 0);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const thisMonthAgg = await reader.transaction.aggregate({
          where: {
            stokvelGroupId: groupId,
            transactionType: 'CONTRIBUTION',
            status: 'COMPLETED',
            transactionDate: { gte: startOfMonth },
          },
          _sum: { amount: true },
        });

        return {
          totalMembers: memberCount,
          totalBalance,
          monthlyTarget,
          collectedThisMonth: Number(thisMonthAgg._sum.amount || 0),
          pendingTransactions: pendingCount,
          totalContributions,
          totalPayouts,
        };
      });

      return res.json({ success: true, data: stats, message: 'Group statistics retrieved successfully' });
    } catch (error: any) {
      logger.error('Get group stats error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // ────────────────────────────────────────
  // GET /:id/members  — List group members
  // ────────────────────────────────────────
  router.get('/:id/members', async (req: any, res: Response) => {
    try {
      const groupId = String(req.params.id);

      const members = await prisma.member.findMany({
        where: { stokvelGroupId: groupId },
        include: {
          user: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
        },
        orderBy: { joinedAt: 'desc' },
      });

      return res.json({ success: true, data: members, message: 'Group members retrieved successfully' });
    } catch (error: any) {
      logger.error('Get group members error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  return router;
}
