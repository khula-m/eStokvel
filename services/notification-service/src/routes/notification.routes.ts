import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'winston';
import type { CacheHelper } from '@estokvel/shared';
import { sendSMS, SMS_TEMPLATES } from '../sms.client';

export function notificationRoutes(prisma: PrismaClient, cache: CacheHelper, logger: Logger): Router {
  const router = Router();

  // ── GET / — get user's notifications (recent transactions as notifications) ──
  router.get('/', async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;

      const transactions = await (prisma as any).transaction.findMany({
        where: { member: { userId } },
        orderBy: { recordDate: 'desc' },
        take: 10,
        include: { group: { select: { name: true } } },
      });

      const notifications = transactions.map((tx: any) => ({
        id: tx.id,
        type: tx.transactionType,
        message: `${tx.transactionType}: R${tx.amount} - ${tx.group.name}`,
        status: tx.status,
        date: tx.recordDate,
      }));

      res.json({ success: true, data: notifications, message: 'Notifications retrieved successfully' });
    } catch (error) {
      next(error);
    }
  });

  // ── POST /sms — send SMS notification (admin) ──
  router.post('/sms', async (req, res, next) => {
    try {
      const { phoneNumber, message } = req.body;

      if (!phoneNumber || !message) {
        res.status(400).json({ success: false, message: 'phoneNumber and message are required' });
        return;
      }

      const result = await sendSMS(phoneNumber, message, logger);

      if (result.success) {
        res.json({ success: true, data: { messageId: result.messageId }, message: 'SMS sent successfully' });
      } else {
        res.status(500).json({ success: false, message: result.error || 'Failed to send SMS' });
      }
    } catch (error) {
      next(error);
    }
  });

  // ── POST /reminders/contribution — send contribution reminders to group ──
  router.post('/reminders/contribution', async (req, res, next) => {
    try {
      const { groupId, dueDate } = req.body;

      if (!groupId || !dueDate) {
        res.status(400).json({ success: false, message: 'groupId and dueDate are required' });
        return;
      }

      const group = await (prisma as any).stokvelGroup.findUnique({
        where: { id: groupId },
        include: { members: { include: { user: true } } },
      });

      if (!group) {
        res.status(404).json({ success: false, message: 'Group not found' });
        return;
      }

      const dueDateStr = new Date(dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' });
      const amount = Number(group.contributionAmount);

      for (const member of group.members) {
        await sendSMS(
          member.user.phoneNumber,
          SMS_TEMPLATES.CONTRIBUTION_DUE(member.user.fullName, amount, group.name, dueDateStr),
          logger
        );
      }

      res.json({ success: true, message: 'Contribution reminders sent successfully' });
    } catch (error) {
      next(error);
    }
  });

  // ── POST /reminders/meeting — send meeting reminders to group ──
  router.post('/reminders/meeting', async (req, res, next) => {
    try {
      const { groupId, meetingDate, meetingTime } = req.body;

      if (!groupId || !meetingDate || !meetingTime) {
        res.status(400).json({ success: false, message: 'groupId, meetingDate, and meetingTime are required' });
        return;
      }

      const group = await (prisma as any).stokvelGroup.findUnique({
        where: { id: groupId },
        include: { members: { include: { user: true } } },
      });

      if (!group) {
        res.status(404).json({ success: false, message: 'Group not found' });
        return;
      }

      const dateStr = new Date(meetingDate).toLocaleDateString('en-ZA', {
        weekday: 'long', day: 'numeric', month: 'long',
      });

      for (const member of group.members) {
        await sendSMS(
          member.user.phoneNumber,
          SMS_TEMPLATES.MEETING_REMINDER(group.name, dateStr, meetingTime),
          logger
        );
      }

      res.json({ success: true, message: 'Meeting reminders sent successfully' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
