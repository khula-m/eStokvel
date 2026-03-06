import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireGroupMembership } from "../middleware/groupSecurity.middleware";
import { roleMiddleware } from "../middleware/role.middleware";
import { TransactionController } from '../controllers/transaction.controller';
import { validate, createTransactionSchema, contributeSchema } from '../middleware/zodValidation.middleware';

const router = express.Router();
const transactionController = new TransactionController();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Transaction routes with security middleware
router.post("/", roleMiddleware(['SUPERADMIN']), validate(createTransactionSchema), transactionController.createTransaction.bind(transactionController)); // Only SUPERADMIN can manually create transactions
router.post("/contribute", validate(contributeSchema), transactionController.contribute.bind(transactionController)); // Members (incl admin) make own payments
router.get("/", requireGroupMembership, transactionController.getTransactions.bind(transactionController)); // Only members can view
router.get("/my", transactionController.getMyTransactions.bind(transactionController)); // User's own transactions (no group check needed)
router.get("/dashboard/:groupId", requireGroupMembership, transactionController.getDashboardData.bind(transactionController)); // Only members
router.get("/:id", requireGroupMembership, transactionController.getTransaction.bind(transactionController)); // Only members

export default router;
