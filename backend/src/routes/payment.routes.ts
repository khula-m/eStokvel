import express from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadPaymentProof, handleUploadError } from '../middleware/upload.middleware';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   PUT /api/payments/groups/:groupId/bank-details
 * @desc    Update bank details for a group (ADMIN only)
 * @access  Private (Admin)
 */
router.put('/groups/:groupId/bank-details', paymentController.updateBankDetails);

/**
 * @route   GET /api/payments/groups/:groupId/bank-details
 * @desc    Get bank details for a group (members can view)
 * @access  Private (Members)
 */
router.get('/groups/:groupId/bank-details', paymentController.getBankDetails);

/**
 * @route   POST /api/payments/transactions/:transactionId/proof
 * @desc    Upload payment proof for a transaction
 * @access  Private (Members)
 */
router.post(
  '/transactions/:transactionId/proof',
  uploadPaymentProof,
  handleUploadError,
  paymentController.uploadPaymentProof
);

/**
 * @route   PUT /api/payments/transactions/:transactionId/verify
 * @desc    Verify a payment (ADMIN only)
 * @access  Private (Admin)
 */
router.put('/transactions/:transactionId/verify', paymentController.verifyPayment);

/**
 * @route   GET /api/payments/groups/:groupId/pending
 * @desc    Get pending payments awaiting verification (ADMIN only)
 * @access  Private (Admin)
 */
router.get('/groups/:groupId/pending', paymentController.getPendingPayments);

export default router;
