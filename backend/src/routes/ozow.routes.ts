import express from 'express';
import { ozowController } from '../controllers/ozow.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// ── Authenticated routes (member initiates payment, checks status) ──
router.post('/initiate', authMiddleware, ozowController.initiatePayment);
router.get('/status/:transactionId', authMiddleware, ozowController.checkStatus);

// ── Public webhook routes (Ozow server-to-server, verified by hash) ──
router.post('/notify', ozowController.handleNotification);
router.post('/payout-notify', ozowController.handlePayoutNotification);

// ── Public redirect routes (user's browser returns here) ──
router.get('/success', ozowController.handleSuccess);
router.get('/error', ozowController.handleError);
router.get('/cancel', ozowController.handleCancel);

export default router;
