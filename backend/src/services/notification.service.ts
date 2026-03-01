/**
 * Notification Service for eStokvel
 * Manages scheduled notifications and triggers SMS/push notifications
 */

import { prisma } from '../utils/prisma';
import { smsService } from './sms.service';

export class NotificationService {
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
      console.error('Error sending transaction notification:', error);
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
      console.error('Error sending welcome notification:', error);
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
      console.error('Error sending group join notification:', error);
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
      console.error('Error sending contribution reminders:', error);
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
      console.error('Error sending meeting reminders:', error);
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

    return transactions.map(tx => ({
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
