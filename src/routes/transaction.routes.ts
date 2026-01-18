import express from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const transactionController = new TransactionController();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Transaction Routes
router.post('/', transactionController.createTransaction.bind(transactionController));
router.get('/', transactionController.getTransactions.bind(transactionController));
router.get('/me', transactionController.getMyTransactions.bind(transactionController));
router.get('/:id', transactionController.getTransaction.bind(transactionController));
router.put('/:id', transactionController.updateTransaction.bind(transactionController));
router.get('/group/:groupId/stats', transactionController.getGroupTransactionStats.bind(transactionController));

// Special transaction types
router.post('/contribution', transactionController.recordContribution.bind(transactionController));
router.post('/payout', transactionController.recordPayout.bind(transactionController));
router.post('/loan', transactionController.recordLoan.bind(transactionController));
router.post('/loan/repayment', transactionController.recordLoanRepayment.bind(transactionController));

export default router;
