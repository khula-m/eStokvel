import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { TransactionController } from '../controllers/transaction.controller';

const router = express.Router();
const transactionController = new TransactionController();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Transaction routes
router.post("/", transactionController.createTransaction.bind(transactionController));
router.get("/", transactionController.getTransactions.bind(transactionController));
router.get("/:id", transactionController.getTransaction.bind(transactionController));
router.get("/dashboard/:groupId", transactionController.getDashboardData.bind(transactionController));

export default router;
