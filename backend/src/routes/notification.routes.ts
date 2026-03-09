import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// Register push token
router.post('/push-token', notificationController.registerPushToken.bind(notificationController));

// Get user's notifications
router.get('/', notificationController.getNotifications.bind(notificationController));

// Send SMS (per-group admin - service validates group admin status)
router.post('/sms', notificationController.sendSMSNotification.bind(notificationController));

// Send contribution reminders to group (per-group admin - service validates)
router.post('/reminders/contribution', notificationController.sendContributionReminders.bind(notificationController));

// Send meeting reminder to group (per-group admin - service validates)
router.post('/reminders/meeting', notificationController.sendMeetingReminder.bind(notificationController));

export default router;
