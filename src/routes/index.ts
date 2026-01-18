import express from 'express';
import authRoutes from './auth.routes';
import stokvelRoutes from './stokvel.routes';
import memberRoutes from './member.routes';
import transactionRoutes from './transaction.routes';

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
router.use('/stokvels', stokvelRoutes);
router.use('/members', memberRoutes);
router.use('/transactions', transactionRoutes);

export default router;

