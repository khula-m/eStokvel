import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'winston';
import type { CacheHelper } from '@estokvel/shared';

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 5000;

export function announcementRoutes(prisma: PrismaClient, cache: CacheHelper, logger: Logger): Router {
  const router = Router();

  // ── POST / — create announcement ──
  router.post('/', async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;
      const { title, content, groupId, pinned, expiresAt } = req.body;

      if (!title || title.trim().length === 0) {
        res.status(400).json({ success: false, message: 'Title cannot be empty' });
        return;
      }
      if (title.length > MAX_TITLE_LENGTH) {
        res.status(400).json({ success: false, message: `Title cannot exceed ${MAX_TITLE_LENGTH} characters` });
        return;
      }
      if (!content || content.trim().length === 0) {
        res.status(400).json({ success: false, message: 'Content cannot be empty' });
        return;
      }
      if (content.length > MAX_CONTENT_LENGTH) {
        res.status(400).json({ success: false, message: `Content cannot exceed ${MAX_CONTENT_LENGTH} characters` });
        return;
      }

      // Verify admin or SUPERADMIN
      const membership = await (prisma as any).member.findFirst({
        where: { userId, stokvelGroupId: groupId, role: 'ADMIN' },
      });
      const user = await (prisma as any).user.findUnique({ where: { id: userId } });

      if (!membership && user?.role !== 'SUPERADMIN') {
        res.status(403).json({ success: false, message: 'Only group admins can create announcements' });
        return;
      }

      const announcement = await (prisma as any).announcement.create({
        data: {
          title,
          content,
          groupId,
          createdBy: userId,
          pinned: pinned || false,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        },
        include: {
          author: { select: { id: true, fullName: true, phoneNumber: true, role: true } },
          _count: { select: { readBy: true } },
        },
      });

      await cache.invalidate(`cache:announcements:${groupId}*`);

      res.status(201).json({ success: true, data: announcement, message: 'Announcement created successfully' });
    } catch (error) {
      next(error);
    }
  });

  // ── GET /group/:groupId — get group announcements ──
  router.get('/group/:groupId', async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;
      const { groupId } = req.params;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 50);
      const skip = (page - 1) * limit;

      const cacheKey = `cache:announcements:${groupId}:p${page}:l${limit}`;

      const data = await cache.getOrSet(cacheKey, 60, async () => {
        const [announcements, total] = await Promise.all([
          (prisma as any).announcement.findMany({
            where: { groupId },
            include: {
              author: { select: { id: true, fullName: true, role: true } },
              _count: { select: { readBy: true } },
              readBy: { where: { userId }, select: { id: true } },
            },
            orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
            skip,
            take: limit,
          }),
          (prisma as any).announcement.count({ where: { groupId } }),
        ]);

        const memberCount = await (prisma as any).member.count({ where: { stokvelGroupId: groupId } });

        const formatted = announcements.map((a: any) => ({
          ...a,
          isRead: a.readBy.length > 0,
          readCount: a._count.readBy,
          totalMembers: memberCount,
          readBy: undefined,
        }));

        return { announcements: formatted, total, page, limit, pages: Math.ceil(total / limit) };
      });

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  // ── PUT /:id/read — mark announcement as read ──
  router.put('/:id/read', async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      await (prisma as any).announcementRead.upsert({
        where: { announcementId_userId: { announcementId: id, userId } },
        update: {},
        create: { announcementId: id, userId },
      });

      res.json({ success: true, message: 'Marked as read' });
    } catch (error) {
      next(error);
    }
  });

  // ── PUT /:id — update announcement ──
  router.put('/:id', async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const { title, content, pinned } = req.body;

      const announcement = await (prisma as any).announcement.findUnique({ where: { id } });
      if (!announcement) {
        res.status(404).json({ success: false, message: 'Announcement not found' });
        return;
      }

      if (announcement.createdBy !== userId) {
        const user = await (prisma as any).user.findUnique({ where: { id: userId } });
        if (user?.role !== 'SUPERADMIN') {
          res.status(403).json({ success: false, message: 'Only the author can edit this announcement' });
          return;
        }
      }

      const updated = await (prisma as any).announcement.update({
        where: { id },
        data: { title, content, pinned },
        include: {
          author: { select: { id: true, fullName: true, role: true } },
          _count: { select: { readBy: true } },
        },
      });

      await cache.invalidate(`cache:announcements:${announcement.groupId}*`);

      res.json({ success: true, data: updated, message: 'Announcement updated' });
    } catch (error) {
      next(error);
    }
  });

  // ── DELETE /:id — delete announcement ──
  router.delete('/:id', async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const announcement = await (prisma as any).announcement.findUnique({ where: { id } });
      if (!announcement) {
        res.status(404).json({ success: false, message: 'Announcement not found' });
        return;
      }

      if (announcement.createdBy !== userId) {
        const user = await (prisma as any).user.findUnique({ where: { id: userId } });
        if (user?.role !== 'SUPERADMIN') {
          res.status(403).json({ success: false, message: 'Only the author can delete this announcement' });
          return;
        }
      }

      await (prisma as any).announcement.delete({ where: { id } });
      await cache.invalidate(`cache:announcements:${announcement.groupId}*`);

      res.json({ success: true, message: 'Announcement deleted' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
