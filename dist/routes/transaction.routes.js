"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const transaction_controller_1 = require("../controllers/transaction.controller");
const router = express_1.default.Router();
const transactionController = new transaction_controller_1.TransactionController();
router.use(auth_middleware_1.authMiddleware);
router.post("/", transactionController.createTransaction.bind(transactionController));
router.get("/", transactionController.getTransactions.bind(transactionController));
router.get("/:id", transactionController.getTransaction.bind(transactionController));
router.get("/dashboard/:groupId", transactionController.getDashboardData.bind(transactionController));
exports.default = router;
//# sourceMappingURL=transaction.routes.js.map