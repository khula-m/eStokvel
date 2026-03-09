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

      // Send SMS based on transaction type
      switch (transaction.transactionType) {
        case 'CONTRIBUTION':
          await smsService.sendContributionReceived(
            user.phoneNumber,
            user.fullName,
            amount,
            group.name
          );
          break;
        case 'PAYOUT':
          await smsService.sendPayoutNotification(
            user.phoneNumber,
            user.fullName,
            amount,
            group.name
          );
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
