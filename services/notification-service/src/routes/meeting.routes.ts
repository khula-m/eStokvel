import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'winston';
import type { CacheHelper } from '@estokvel/shared';

export function meetingRoutes(prisma: PrismaClient, cache: CacheHelper, logger: Logger): Router {
  const router = Router();

  // ── POST / — schedule a meeting ──
  router.post('/', async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;
      const { title, description, date, location, groupId } = req.body;

      // Verify admin or SUPERADMIN
      const membership = await (prisma as any).member.findFirst({
        where: { userId, stokvelGroupId: groupId, role: 'ADMIN' },
      });
      const user = await (prisma as any).user.findUnique({ where: { id: userId } });

      if (!membership && user?.role !== 'SUPERADMIN') {
        res.status(403).json({ success: false, message: 'Only group admins can schedule meetings' });
        return;
      }

      const meeting = await (prisma as any).meeting.create({
        data: {
          title,
          description,
          date: new Date(date),
          location,
          groupId,
          createdBy: userId,
        },
        include: {
          author: { select: { id: true, fullName: true, role: true } },
          _count: { select: { attendance: true } },
        },
      });

      await cache.invalidate(`cache:meetings:${groupId}*`);

      res.status(201).json({ success: true, data: meeting, message: 'Meeting scheduled successfully' });
    } catch (error) {
      next(error);
    }
  });

  // ── GET /group/:groupId — get group meetings ──
  router.get('/group/:groupId', async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;
      const { groupId } = req.params;
      const upcoming = req.query.upcoming !== 'false';

      const cacheKey = `cache:meetings:${groupId}:upcoming${upcoming}`;

      const data = await cache.getOrSet(cacheKey, 60, async () => {
        const now = new Date();
        const whereClause: any = { groupId };
        if (upcoming) {
          whereClause.date = { gte: now };
        }

        const meetings = await (prisma as any).meeting.findMany({
          where: whereClause,
          include: {
            author: { select: { id: true, fullName: true, role: true } },
            attendance: {
              select: { userId: true, status: true, user: { select: { fullName: true } } },
            },
            _count: { select: { attendance: true } },
          },
          orderBy: { date: upcoming ? 'asc' : 'desc' },
        });

        const memberCount = await (prisma as any).member.count({ where: { stokvelGroupId: groupId } });

        return meetings.map((m: any) => {
          const userAttendance = m.attendance.find((a: any) => a.userId === userId);
          const goingCount = m.attendance.filter((a: any) => a.status === 'GOING').length;
          const maybeCount = m.attendance.filter((a: any) => a.status === 'MAYBE').length;
          const attendees = m.attendance
            .filter((a: any) => a.status === 'GOING' || a.status === 'MAYBE')
            .map((a: any) => ({ name: a.user?.fullName || 'Unknown', status: a.status }));
          return {
            ...m,
            userStatus: userAttendance?.status || null,
            myStatus: userAttendance?.status || null,
            goingCount,
            maybeCount,
            totalMembers: memberCount,
            attendees,
            attendance: undefined,
          };
        });
      });

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  // ── PUT /:id/rsvp — RSVP to a meeting ──
  router.put('/:id/rsvp', async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const { status } = req.body;

      if (!['GOING', 'MAYBE', 'NOT_GOING'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status must be GOING, MAYBE, or NOT_GOING' });
        return;
      }

      const meeting = await (prisma as any).meeting.findUnique({ where: { id } });
      if (!meeting) {
        res.status(404).json({ success: false, message: 'Meeting not found' });
        return;
      }

      // Verify membership
      const membership = await (prisma as any).member.findFirst({
        where: { userId, stokvelGroupId: meeting.groupId },
      });
      if (!membership) {
        res.status(403).json({ success: false, message: 'You are not a member of this group' });
        return;
      }

      const attendance = await (prisma as any).meetingAttendance.upsert({
        where: { meetingId_userId: { meetingId: id, userId } },
        update: { status },
        create: { meetingId: id, userId, status },
      });

      await cache.invalidate(`cache:meetings:${meeting.groupId}*`);

      res.json({ success: true, data: attendance, message: 'RSVP updated' });
    } catch (error) {
      next(error);
    }
  });

  // ── PUT /:id — update meeting ──
  router.put('/:id', async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const { title, description, date, location } = req.body;

      const meeting = await (prisma as any).meeting.findUnique({ where: { id } });
      if (!meeting) {
        res.status(404).json({ success: false, message: 'Meeting not found' });
        return;
      }

      if (meeting.createdBy !== userId) {
        const user = await (prisma as any).user.findUnique({ where: { id: userId } });
        if (user?.role !== 'SUPERADMIN') {
          res.status(403).json({ success: false, message: 'Only the organizer can edit this meeting' });
          return;
        }
      }

      const updated = await (prisma as any).meeting.update({
        where: { id },
        data: {
          title,
          description,
          date: date ? new Date(date) : undefined,
          location,
        },
        include: {
          author: { select: { id: true, fullName: true } },
          _count: { select: { attendance: true } },
        },
      });

      await cache.invalidate(`cache:meetings:${meeting.groupId}*`);

      res.json({ success: true, data: updated, message: 'Meeting updated' });
    } catch (error) {
      next(error);
    }
  });

  // ── DELETE /:id — cancel meeting ──
  router.delete('/:id', async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const meeting = await (prisma as any).meeting.findUnique({ where: { id } });
      if (!meeting) {
        res.status(404).json({ success: false, message: 'Meeting not found' });
        return;
      }

      if (meeting.createdBy !== userId) {
        const user = await (prisma as any).user.findUnique({ where: { id: userId } });
        if (user?.role !== 'SUPERADMIN') {
          res.status(403).json({ success: false, message: 'Only the organizer can cancel this meeting' });
          return;
        }
      }

      await (prisma as any).meeting.delete({ where: { id } });
      await cache.invalidate(`cache:meetings:${meeting.groupId}*`);

      res.json({ success: true, message: 'Meeting cancelled' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
