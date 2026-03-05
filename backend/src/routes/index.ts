import express from 'express';
import authRoutes from './auth.routes';
import groupRoutes from './groups.routes';
import transactionRoutes from './transaction.routes';
import userRoutes from './user.routes';
import notificationRoutes from './notification.routes';
import chatRoutes from './chat.routes';
import paymentRoutes from './payment.routes';
import announcementRoutes from './announcement.routes';
import meetingRoutes from './meeting.routes';
import ozowRoutes from './ozow.routes';

const router = express.Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API Routes
router.use('/auth', authRoutes);
router.use('/groups', groupRoutes);
router.use('/transactions', transactionRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);
router.use('/chat', chatRoutes);
router.use('/payments', paymentRoutes);
router.use('/announcements', announcementRoutes);
router.use('/meetings', meetingRoutes);
router.use('/ozow', ozowRoutes);

export default router;

