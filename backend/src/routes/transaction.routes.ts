import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireGroupMembership, requireAdminRole } from "../middleware/groupSecurity.middleware";
import { TransactionController } from '../controllers/transaction.controller';

const router = express.Router();
const transactionController = new TransactionController();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Transaction routes with security middleware
router.post("/", requireAdminRole, transactionController.createTransaction.bind(transactionController)); // Only ADMIN can create
router.post("/contribute", transactionController.contribute.bind(transactionController)); // Members can make own payments
router.get("/", requireGroupMembership, transactionController.getTransactions.bind(transactionController)); // Only members can view
router.get("/my", transactionController.getMyTransactions.bind(transactionController)); // User's own transactions (no group check needed)
router.get("/dashboard/:groupId", requireGroupMembership, transactionController.getDashboardData.bind(transactionController)); // Only members
router.get("/:id", requireGroupMembership, transactionController.getTransaction.bind(transactionController)); // Only members

export default router;
