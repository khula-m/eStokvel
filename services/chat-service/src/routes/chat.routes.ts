import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'winston';
import type { CacheHelper } from '@estokvel/shared';

const MAX_MESSAGE_LENGTH = 2000;

export function chatRoutes(prisma: PrismaClient, cache: CacheHelper, logger: Logger): Router {
  const router = Router();

  // ── POST /messages — send a message ──
  router.post('/messages', async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;
      const { stokvelGroupId, message, messageType } = req.body;

      if (!stokvelGroupId || !message) {
        res.status(400).json({ success: false, message: 'stokvelGroupId and message are required' });
        return;
      }

      const trimmed = message.trim();
      if (trimmed.length === 0) {
        res.status(400).json({ success: false, message: 'Message cannot be empty' });
        return;
      }
      if (trimmed.length > MAX_MESSAGE_LENGTH) {
        res.status(400).json({ success: false, message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters` });
        return;
      }

      // Verify membership
      const membership = await (prisma as any).member.findFirst({
        where: { userId, stokvelGroupId },
      });
      if (!membership) {
        res.status(403).json({ success: false, message: 'You are not a member of this group' });
        return;
      }

      // Only admins can send announcements
      if (messageType === 'ANNOUNCEMENT' && membership.role !== 'ADMIN') {
        res.status(403).json({ success: false, message: 'Only group admins can send announcements' });
        return;
      }

      const chatMessage = await (prisma as any).chatMessage.create({
        data: {
          stokvelGroupId,
          senderId: userId,
          message: trimmed,
          messageType: messageType || 'TEXT',
        },
        include: {
          sender: { select: { id: true, fullName: true, phoneNumber: true } },
        },
      });

      // Invalidate cache for this group's messages
      await cache.invalidate(`cache:chat:${stokvelGroupId}*`);

      res.status(201).json({ success: true, data: chatMessage, message: 'Message sent successfully' });
    } catch (error) {
      next(error);
    }
  });

  // ── GET /groups/:groupId/messages — get messages for a group ──
  router.get('/groups/:groupId/messages', async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;
      const { groupId } = req.params;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);

      // Verify membership
      const membership = await (prisma as any).member.findFirst({
        where: { userId, stokvelGroupId: groupId },
      });
      if (!membership) {
        res.status(403).json({ success: false, message: 'You are not a member of this group' });
        return;
      }

      const skip = (page - 1) * limit;
      const cacheKey = `cache:chat:${groupId}:p${page}:l${limit}`;

      const data = await cache.getOrSet(cacheKey, 15, async () => {
        const [messages, total] = await Promise.all([
          (prisma as any).chatMessage.findMany({
            where: { stokvelGroupId: groupId },
            include: {
              sender: { select: { id: true, fullName: true, phoneNumber: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          (prisma as any).chatMessage.count({ where: { stokvelGroupId: groupId } }),
        ]);

        return {
          messages: messages.reverse(), // Oldest first for display
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasMore: page * limit < total,
          },
        };
      }); // Short TTL — chat is real-time-ish

      res.json({ success: true, data, message: 'Messages retrieved successfully' });
    } catch (error) {
      next(error);
    }
  });

  // ── PUT /groups/:groupId/read — mark messages as read ──
  router.put('/groups/:groupId/read', async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;
      const { groupId } = req.params;

      await (prisma as any).chatMessage.updateMany({
        where: {
          stokvelGroupId: groupId,
          senderId: { not: userId },
          isRead: false,
        },
        data: { isRead: true },
      });

      res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
      next(error);
    }
  });

  // ── GET /unread — unread message count across all groups ──
  router.get('/unread', async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;

      const memberships = await (prisma as any).member.findMany({
        where: { userId },
        select: { stokvelGroupId: true },
      });

      const groupIds = memberships.map((m: any) => m.stokvelGroupId);

      const unreadCount = await (prisma as any).chatMessage.count({
        where: {
          stokvelGroupId: { in: groupIds },
          senderId: { not: userId },
          isRead: false,
        },
      });

      res.json({ success: true, data: { unreadCount }, message: 'Unread count retrieved' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
