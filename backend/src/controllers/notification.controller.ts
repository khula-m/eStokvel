import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { smsService } from '../services/sms.service';
import logger from '../utils/logger';

export class NotificationController {
  /**
   * Register Expo push token for the authenticated user
   */
  async registerPushToken(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { pushToken } = req.body;
      if (!pushToken || typeof pushToken !== 'string' || !pushToken.startsWith('ExponentPushToken[')) {
        return res.status(400).json({ success: false, message: 'Valid Expo push token is required' });
      }

      await notificationService.registerPushToken(userId, pushToken);

      return res.status(200).json({ success: true, message: 'Push token registered' });
    } catch (error: any) {
      logger.error('Register push token error:', error);
      return res.status(500).json({ success: false, message: 'Failed to register push token' });
    }
  }

  /**
   * Get user's notifications
   */
  async getNotifications(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const notifications = await notificationService.getUserNotifications(userId);
      
      return res.status(200).json({
        success: true,
        data: notifications,
        message: 'Notifications retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get notifications error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve notifications'
      });
    }
  }

  /**
   * Send SMS notification (Admin only)
   */
  async sendSMSNotification(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { phoneNumber, message, groupId: _groupId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!phoneNumber || !message) {
        return res.status(400).json({
          success: false,
          message: 'phoneNumber and message are required'
        });
      }

      // In production, verify user is admin of the group
      // For now, allow any authenticated user to send (development)

      const result = await smsService.sendSMS(phoneNumber, message);

      if (result.success) {
        return res.status(200).json({
          success: true,
          data: { messageId: result.messageId },
          message: 'SMS sent successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: result.error || 'Failed to send SMS'
        });
      }
    } catch (error: any) {
      logger.error('Send SMS error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send SMS notification'
      });
    }
  }

  /**
   * Send contribution reminders to a group
   */
  async sendContributionReminders(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { groupId, dueDate } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!groupId || !dueDate) {
        return res.status(400).json({
          success: false,
          message: 'groupId and dueDate are required'
        });
      }

      await notificationService.sendContributionReminders(groupId, new Date(dueDate));

      return res.status(200).json({
        success: true,
        message: 'Contribution reminders sent successfully'
      });
    } catch (error: any) {
      logger.error('Send reminders error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send reminders'
      });
    }
  }

  /**
   * Send meeting reminder to a group
   */
  async sendMeetingReminder(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { groupId, meetingDate, meetingTime } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!groupId || !meetingDate || !meetingTime) {
        return res.status(400).json({
          success: false,
          message: 'groupId, meetingDate, and meetingTime are required'
        });
      }

      await notificationService.sendMeetingReminder(groupId, new Date(meetingDate), meetingTime);

      return res.status(200).json({
        success: true,
        message: 'Meeting reminders sent successfully'
      });
    } catch (error: any) {
      logger.error('Send meeting reminder error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send meeting reminders'
      });
    }
  }
}

export const notificationController = new NotificationController();
export default notificationController;
