"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionController = void 0;
const transaction_service_1 = require("../services/transaction.service");
const enums_1 = require("../utils/enums");
const transactionService = new transaction_service_1.TransactionService();
class TransactionController {
    async createTransaction(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const input = req.body;
            if (!input.stokvelGroupId || !input.transactionType || !input.amount || !input.paymentMethod) {
                return res.status(400).json({
                    success: false,
                    message: 'stokvelGroupId, transactionType, amount, and paymentMethod are required'
                });
            }
            if (!Object.values(enums_1.TransactionType).includes(input.transactionType)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid transaction type. Valid types: \${Object.values(TransactionType).join(', ')}`
                });
            }
            if (!Object.values(enums_1.PaymentMethod).includes(input.paymentMethod)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid payment method. Valid methods: \${Object.values(PaymentMethod).join(', ')}`
                });
            }
            const result = await transactionService.createTransaction(input, userId);
            if (result.success) {
                return res.status(201).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Create transaction error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async getTransaction(req, res) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
            }
            const result = await transactionService.getTransactionById(id);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Get transaction error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message,
            });
        }
    }
    async updateTransaction(req, res) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const userId = req.user?.id;
            const input = req.body;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
            }
            const result = await transactionService.updateTransaction(id, input, userId);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Update transaction error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async getTransactions(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const { stokvelGroupId, memberId, transactionType, status, paymentMethod, startDate, endDate, minAmount, maxAmount, page = '1', limit = '20' } = req.query;
            const filters = {};
            if (stokvelGroupId)
                filters.stokvelGroupId = stokvelGroupId;
            if (memberId)
                filters.memberId = memberId;
            if (transactionType)
                filters.transactionType = transactionType;
            if (status)
                filters.status = status;
            if (paymentMethod)
                filters.paymentMethod = paymentMethod;
            if (startDate)
                filters.startDate = new Date(startDate);
            if (endDate)
                filters.endDate = new Date(endDate);
            if (minAmount)
                filters.minAmount = parseFloat(minAmount);
            if (maxAmount)
                filters.maxAmount = parseFloat(maxAmount);
            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const result = await transactionService.getTransactions(filters, pageNum, limitNum);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Get transactions error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async getGroupTransactionStats(req, res) {
        try {
            const { groupId } = req.params;
            const userId = req.user?.id;
            const { period } = req.query;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const result = await transactionService.getGroupTransactionStats(String(groupId), period);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Get transaction stats error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async recordContribution(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const { stokvelGroupId, memberId, amount, paymentMethod, transactionDate, notes } = req.body;
            if (!stokvelGroupId || !memberId || !amount || !paymentMethod) {
                return res.status(400).json({
                    success: false,
                    message: 'stokvelGroupId, memberId, amount, and paymentMethod are required'
                });
            }
            if (!Object.values(enums_1.PaymentMethod).includes(paymentMethod)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid payment method. Valid methods: \${Object.values(PaymentMethod).join(', ')}`
                });
            }
            const result = await transactionService.recordContribution({
                stokvelGroupId,
                memberId,
                amount: parseFloat(amount),
                paymentMethod,
                transactionDate: transactionDate ? new Date(transactionDate) : undefined,
                notes
            }, userId);
            if (result.success) {
                return res.status(201).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Record contribution error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async recordPayout(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const { stokvelGroupId, memberId, amount, paymentMethod, transactionDate, notes } = req.body;
            if (!stokvelGroupId || !memberId || !amount || !paymentMethod) {
                return res.status(400).json({
                    success: false,
                    message: 'stokvelGroupId, memberId, amount, and paymentMethod are required'
                });
            }
            if (!Object.values(enums_1.PaymentMethod).includes(paymentMethod)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid payment method. Valid methods: \${Object.values(PaymentMethod).join(', ')}`
                });
            }
            const result = await transactionService.recordPayout({
                stokvelGroupId,
                memberId,
                amount: parseFloat(amount),
                paymentMethod,
                transactionDate: transactionDate ? new Date(transactionDate) : undefined,
                notes
            }, userId);
            if (result.success) {
                return res.status(201).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Record payout error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async recordLoan(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const { stokvelGroupId, memberId, amount, interestRate, dueDate, notes } = req.body;
            if (!stokvelGroupId || !memberId || !amount || !dueDate) {
                return res.status(400).json({
                    success: false,
                    message: 'stokvelGroupId, memberId, amount, and dueDate are required'
                });
            }
            const result = await transactionService.recordLoan({
                stokvelGroupId,
                memberId,
                amount: parseFloat(amount),
                interestRate: interestRate ? parseFloat(interestRate) : undefined,
                dueDate: new Date(dueDate),
                notes
            }, userId);
            if (result.success) {
                return res.status(201).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Record loan error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async recordLoanRepayment(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const { transactionId, amount, paymentMethod, notes } = req.body;
            if (!transactionId || !amount || !paymentMethod) {
                return res.status(400).json({
                    success: false,
                    message: 'transactionId, amount, and paymentMethod are required'
                });
            }
            if (!Object.values(enums_1.PaymentMethod).includes(paymentMethod)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid payment method. Valid methods: \${Object.values(PaymentMethod).join(', ')}`
                });
            }
            const result = await transactionService.recordLoanRepayment({
                transactionId,
                amount: parseFloat(amount),
                paymentMethod,
                notes
            }, userId);
            if (result.success) {
                return res.status(201).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Record loan repayment error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async getMyTransactions(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const { transactionType, status, startDate, endDate, page = '1', limit = '20' } = req.query;
            const filters = {};
            if (transactionType)
                filters.transactionType = transactionType;
            if (status)
                filters.status = status;
            if (startDate)
                filters.startDate = new Date(startDate);
            if (endDate)
                filters.endDate = new Date(endDate);
            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const result = await transactionService.getTransactions(filters, pageNum, limitNum);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Get my transactions error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async getDashboardData(req, res) {
        try {
            const groupId = String(req.params.groupId);
            const userId = req.user?.id;
            if (!groupId) {
                return res.status(400).json({
                    success: false,
                    message: 'Group ID is required',
                });
            }
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
            }
            const dashboardData = await transactionService.getDashboardData(String(groupId), userId);
            if (dashboardData.success) {
                return res.status(200).json(dashboardData);
            }
            else {
                return res.status(400).json(dashboardData);
            }
        }
        catch (error) {
            console.error('Get dashboard data error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message,
            });
        }
    }
}
exports.TransactionController = TransactionController;
//# sourceMappingURL=transaction.controller.js.map