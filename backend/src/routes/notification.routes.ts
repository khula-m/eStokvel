import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// Get user's notifications
router.get('/', notificationController.getNotifications.bind(notificationController));

// Send SMS (admin only)
router.post('/sms', roleMiddleware(['ADMIN']), notificationController.sendSMSNotification.bind(notificationController));

// Send contribution reminders to group (admin only)
router.post('/reminders/contribution', roleMiddleware(['ADMIN']), notificationController.sendContributionReminders.bind(notificationController));

// Send meeting reminder to group (admin only)
router.post('/reminders/meeting', roleMiddleware(['ADMIN']), notificationController.sendMeetingReminder.bind(notificationController));

export default router;
