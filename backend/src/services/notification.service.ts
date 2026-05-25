/**
 * Notification Service for eStokvel
 * Manages scheduled notifications and triggers SMS/push notifications
 */

import { prisma } from '../utils/prisma';
import { smsService } from './sms.service';
import logger from '../utils/logger';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  channelId?: string;
}

export class NotificationService {
  private static readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  /**
   * Register or update a user's Expo push token
   */
  async registerPushToken(userId: string, pushToken: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { expoPushToken: pushToken }
      });
      return { success: true };
    } catch (error) {
      logger.error('Error registering push token:', error);
      return { success: false };
    }
  }

  /**
   * Send push notification to all members of a group (fire-and-forget)
   */
  async sendPushToGroup(
    groupId: string,
    title: string,
    body: string,
    data: Record<string, unknown> = {},
    channelId: string = 'default',
    excludeUserId?: string
  ) {
    try {
      const group = await prisma.stokvelGroup.findUnique({
        where: { id: groupId },
        include: { members: { include: { user: { select: { id: true, expoPushToken: true } } } } },
      });
      if (!group) return;
      const messages: ExpoPushMessage[] = group.members
        .filter((m: any) => m.user.expoPushToken && m.user.id !== excludeUserId)
        .map((m: any) => ({
          to: m.user.expoPushToken!,
          title,
          body,
          data: { groupId, ...data },
          sound: 'default',
          channelId,
        }));
      await this.sendPushNotifications(messages);
    } catch (error) {
      logger.error('Error sending group push notification:', error);
    }
  }

  /**
   * Notify all group members when a meeting is created
   */
  async notifyMeetingCreated(groupId: string, meetingTitle: string, meetingDate: string, createdByName: string) {
    this.sendPushToGroup(
      groupId,
      'Meeting Scheduled',
      `${createdByName} scheduled "${meetingTitle}" on ${meetingDate}`,
      { type: 'meeting', screen: 'dashboard' },
      'meetings'
    ).catch((e) => logger.error('Meeting push failed:', e));
  }

  /**
   * Notify all group members when an announcement is posted
   */
  async notifyAnnouncementPosted(groupId: string, announcementTitle: string, postedByName: string, excludeUserId?: string) {
    this.sendPushToGroup(
      groupId,
      'New Announcement',
      `${postedByName}: ${announcementTitle}`,
      { type: 'announcement', screen: 'dashboard' },
      'announcements',
      excludeUserId
    ).catch((e) => logger.error('Announcement push failed:', e));
  }

  /**
   * Notify a member when they are added to a group
   */
  async notifyMemberAdded(userId: string, groupName: string, tempPin?: string) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { expoPushToken: true } });
      if (!user?.expoPushToken) return;
      // Existing users (no tempPin) already have credentials — don't tell them
      // about a PIN they don't need.
      const body = tempPin
        ? `You have been added to ${groupName}. Your temporary PIN is: ${tempPin}`
        : `You have been added to ${groupName}. Log in with your existing PIN to see it.`;
      await this.sendPushNotifications([{
        to: user.expoPushToken,
        title: 'Added to Group',
        body,
        data: { type: 'member_added', screen: 'dashboard' },
        sound: 'default',
        channelId: 'default',
      }]);
    } catch (error) {
      logger.error('Error sending member-added push:', error);
    }
  }

  /**
   * Send push notification when a transaction is recorded for a member
   */
  async notifyTransactionPush(userId: string, type: string, amount: number, groupName: string) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { expoPushToken: true } });
      if (!user?.expoPushToken) return;
      const isContribution = type === 'CONTRIBUTION';
      await this.sendPushNotifications([{
        to: user.expoPushToken,
        title: isContribution ? 'Contribution Received' : 'Payout Processed',
        body: isContribution
          ? `R${amount.toFixed(2)} contribution recorded for ${groupName}`
          : `R${amount.toFixed(2)} payout processed from ${groupName}`,
        data: { type: 'transaction', screen: 'notifications' },
        sound: 'default',
        channelId: 'payments',
      }]);
    } catch (error) {
      logger.error('Error sending transaction push:', error);
    }
  }

  /**
   * Send push notifications via Expo Push API
   */
  async sendPushNotifications(messages: ExpoPushMessage[]) {
    if (messages.length === 0) return;

    try {
      const response = await fetch(NotificationService.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result: any = await response.json();
      if (result.errors) {
        logger.error('Expo push errors:', result.errors);
      }
    } catch (error) {
      logger.error('Error sending push notifications:', error);
    }
  }

  /**
   * Send push notification to all group members when a chat message is sent
   */
  async sendChatPushNotification(
    senderId: string,
    groupId: string,
    senderName: string,
    messageText: string
  ) {
    try {
      const group = await prisma.stokvelGroup.findUnique({
        where: { id: groupId },
        include: {
          members: {
            include: { user: { select: { id: true, expoPushToken: true } } }
          }
        }
      });

      if (!group) return;

      // Collect push tokens for all members except the sender
      const messages: ExpoPushMessage[] = group.members
        .filter((m: any) => m.user.id !== senderId && m.user.expoPushToken)
        .map((m: any) => ({
          to: m.user.expoPushToken!,
          title: group.name,
          body: `${senderName}: ${messageText.length > 100 ? messageText.slice(0, 100) + '…' : messageText}`,
          data: { type: 'chat', groupId },
          sound: 'default',
          channelId: 'chat',
        }));

      await this.sendPushNotifications(messages);
    } catch (error) {
      logger.error('Error sending chat push notification:', error);
    }
  }
  /**
   * Send notification when a transaction is recorded
   */
  async notifyTransactionRecorded(transactionId: string) {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          member: {
            include: { user: true }
          },
          group: true
        }
      });

      if (!transaction) return;

      const user = transaction.member.user;
      const group = transaction.group;
      const amount = Number(transaction.amount);

      // Send SMS + push notification based on transaction type
      switch (transaction.transactionType) {
        case 'CONTRIBUTION':
          smsService.sendContributionReceived(user.phoneNumber, user.fullName, amount, group.name)
            .catch((e) => logger.warn('Contribution SMS failed:', e));
          this.notifyTransactionPush(user.id, 'CONTRIBUTION', amount, group.name)
            .catch((e) => logger.warn('Contribution push failed:', e));
          break;
        case 'PAYOUT':
          smsService.sendPayoutNotification(user.phoneNumber, user.fullName, amount, group.name)
            .catch((e) => logger.warn('Payout SMS failed:', e));
          this.notifyTransactionPush(user.id, 'PAYOUT', amount, group.name)
            .catch((e) => logger.warn('Payout push failed:', e));
          break;
      }
    } catch (error) {
      logger.error('Error sending transaction notification:', error);
    }
  }

  /**
   * Send welcome notification to new user
   */
  async notifyUserRegistered(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) return;

      await smsService.sendWelcome(user.phoneNumber, user.fullName);
    } catch (error) {
      logger.error('Error sending welcome notification:', error);
    }
  }

  /**
   * Send notification when user joins a group
   */
  async notifyGroupJoined(userId: string, groupId: string) {
    try {
      const [user, group] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.stokvelGroup.findUnique({ where: { id: groupId } })
      ]);

      if (!user || !group) return;

      await smsService.sendGroupJoinedNotification(
        user.phoneNumber,
        user.fullName,
        group.name
      );
    } catch (error) {
      logger.error('Error sending group join notification:', error);
    }
  }

  /**
   * Send contribution reminders to all members of a group
   * Call this on a schedule (e.g., 3 days before due date)
   */
  async sendContributionReminders(groupId: string, dueDate: Date) {
    try {
      const group = await prisma.stokvelGroup.findUnique({
        where: { id: groupId },
        include: {
          members: {
            include: { user: true }
          }
        }
      });

      if (!group) return;

      const dueDateString = dueDate.toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'long'
      });

      const amount = Number(group.contributionAmount);

      // Send to all members
      for (const member of group.members) {
        await smsService.sendContributionReminder(
          member.user.phoneNumber,
          member.user.fullName,
          amount,
          group.name,
          dueDateString
        );
      }
    } catch (error) {
      logger.error('Error sending contribution reminders:', error);
    }
  }

  /**
   * Send meeting reminder to all group members
   */
  async sendMeetingReminder(groupId: string, meetingDate: Date, meetingTime: string) {
    try {
      const group = await prisma.stokvelGroup.findUnique({
        where: { id: groupId },
        include: {
          members: {
            include: { user: true }
          }
        }
      });

      if (!group) return;

      const dateString = meetingDate.toLocaleDateString('en-ZA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });

      for (const member of group.members) {
        await smsService.sendMeetingReminder(
          member.user.phoneNumber,
          group.name,
          dateString,
          meetingTime
        );
      }
    } catch (error) {
      logger.error('Error sending meeting reminders:', error);
    }
  }

  /**
   * Get notification status/history for a user
   */
  async getUserNotifications(userId: string) {
    // In a full implementation, store notifications in a database table
    // For now, return recent transactions as "notifications"
    const transactions = await prisma.transaction.findMany({
      where: {
        member: { userId }
      },
      orderBy: { recordDate: 'desc' },
      take: 10,
      include: {
        group: { select: { name: true } }
      }
    });

    return transactions.map((tx: any) => ({
      id: tx.id,
      type: tx.transactionType,
      message: `${tx.transactionType}: R${tx.amount} - ${tx.group.name}`,
      status: tx.status,
      date: tx.recordDate
    }));
  }
}

export const notificationService = new NotificationService();
export default notificationService;
