import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// Get user's notifications
router.get('/', notificationController.getNotifications.bind(notificationController));

// Send SMS (admin only - add role middleware in production)
router.post('/sms', notificationController.sendSMSNotification.bind(notificationController));

// Send contribution reminders to group
router.post('/reminders/contribution', notificationController.sendContributionReminders.bind(notificationController));

// Send meeting reminder to group
router.post('/reminders/meeting', notificationController.sendMeetingReminder.bind(notificationController));

export default router;
