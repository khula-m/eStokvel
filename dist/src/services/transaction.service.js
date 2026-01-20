"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const client_1 = require("@prisma/client");
const enums_1 = require("../utils/enums");
const prisma = new client_1.PrismaClient();
class TransactionService {
    generateReferenceNumber() {
        return `STK-
      ${Date.now().toString(36)}-
      ${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
    }
    async createTransaction(data, recordedById) {
        try {
            const group = await prisma.stokvelGroup.findUnique({
                where: { id: data.stokvelGroupId }
            });
            if (!group) {
                return {
                    success: false,
                    message: 'Group not found'
                };
            }
            if (data.memberId) {
                const member = await prisma.member.findUnique({
                    where: { id: data.memberId },
                    include: {
                        group: true
                    }
                });
                if (!member) {
                    return {
                        success: false,
                        message: 'Member not found'
                    };
                }
                if (member.stokvelGroupId !== data.stokvelGroupId) {
                    return {
                        success: false,
                        message: 'Member does not belong to this group'
                    };
                }
            }
            const referenceNumber = data.referenceNumber || this.generateReferenceNumber();
            const transaction = await prisma.transaction.create({
                data: {
                    ...data,
                    referenceNumber,
                    recordedById,
                    currency: data.currency || group.currency,
                    transactionDate: data.transactionDate || new Date(),
                    status: enums_1.TransactionStatus.PENDING,
                    transactionType: Object.values(enums_1.TransactionType).includes(data.transactionType) ? data.transactionType : enums_1.TransactionType.CONTRIBUTION,
                    paymentMethod: Object.values(enums_1.PaymentMethod).includes(data.paymentMethod) ? data.paymentMethod : enums_1.PaymentMethod.CASH
                },
                include: {
                    group: {
                        select: {
                            id: true,
                            name: true,
                            currency: true
                        }
                    },
                    member: data.memberId ? {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    phoneNumber: true
                                }
                            }
                        }
                    } : false,
                    recordedBy: {
                        select: {
                            id: true,
                            fullName: true,
                            phoneNumber: true
                        }
                    }
                }
            });
            if (data.transactionType === enums_1.TransactionType.CONTRIBUTION && data.status === enums_1.TransactionStatus.COMPLETED) {
                console.log(`Contribution of \${data.amount} recorded for member \${data.memberId}`);
            }
            return {
                success: true,
                data: transaction,
                message: 'Transaction created successfully'
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to create transaction',
                error: error
            };
        }
    }
    async getTransactionById(id) {
        try {
            const transaction = await prisma.transaction.findUnique({
                where: { id },
                include: {
                    group: {
                        select: {
                            id: true,
                            name: true,
                            currency: true
                        }
                    },
                    member: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    phoneNumber: true
                                }
                            }
                        }
                    },
                    recordedBy: {
                        select: {
                            id: true,
                            fullName: true,
                            phoneNumber: true
                        }
                    }
                }
            });
            if (!transaction) {
                return {
                    success: false,
                    message: 'Transaction not found'
                };
            }
            return {
                success: true,
                data: transaction,
                message: 'Transaction retrieved successfully'
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to retrieve transaction',
                error: error
            };
        }
    }
    async updateTransaction(id, data, _updatedById) {
        try {
            const transaction = await prisma.transaction.findUnique({
                where: { id }
            });
            if (!transaction) {
                return {
                    success: false,
                    message: 'Transaction not found'
                };
            }
            const updateData = { ...data };
            if (data.status === enums_1.TransactionStatus.COMPLETED && transaction.status !== enums_1.TransactionStatus.COMPLETED) {
                updateData.paidDate = new Date();
            }
            const updatedTransaction = await prisma.transaction.update({
                where: { id },
                data: updateData,
                include: {
                    group: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    member: {
                        include: {
                            user: {
                                select: {
                                    fullName: true
                                }
                            }
                        }
                    }
                }
            });
            return {
                success: true,
                data: updatedTransaction,
                message: 'Transaction updated successfully'
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to update transaction',
                error: error
            };
        }
    }
    async getTransactions(filters, page = 1, limit = 20) {
        try {
            const whereClause = {};
            if (filters.stokvelGroupId) {
                whereClause.stokvelGroupId = filters.stokvelGroupId;
            }
            if (filters.memberId) {
                whereClause.memberId = filters.memberId;
            }
            if (filters.transactionType) {
                whereClause.transactionType = filters.transactionType;
            }
            if (filters.status) {
                whereClause.status = filters.status;
            }
            if (filters.paymentMethod) {
                whereClause.paymentMethod = filters.paymentMethod;
            }
            if (filters.startDate || filters.endDate) {
                whereClause.transactionDate = {};
                if (filters.startDate) {
                    whereClause.transactionDate.gte = filters.startDate;
                }
                if (filters.endDate) {
                    whereClause.transactionDate.lte = filters.endDate;
                }
            }
            if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
                whereClause.amount = {};
                if (filters.minAmount !== undefined) {
                    whereClause.amount.gte = filters.minAmount;
                }
                if (filters.maxAmount !== undefined) {
                    whereClause.amount.lte = filters.maxAmount;
                }
            }
            const skip = (page - 1) * limit;
            const [transactions, total] = await Promise.all([
                prisma.transaction.findMany({
                    where: whereClause,
                    include: {
                        group: {
                            select: {
                                id: true,
                                name: true,
                                currency: true
                            }
                        },
                        member: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        fullName: true,
                                        phoneNumber: true
                                    }
                                }
                            }
                        },
                        recordedBy: {
                            select: {
                                id: true,
                                fullName: true
                            }
                        }
                    },
                    orderBy: {
                        transactionDate: 'desc'
                    },
                    skip,
                    take: limit
                }),
                prisma.transaction.count({ where: whereClause })
            ]);
            const summary = await prisma.transaction.aggregate({
                where: whereClause,
                _sum: {
                    amount: true
                },
                _avg: {
                    amount: true
                },
                _count: {
                    _all: true
                }
            });
            return {
                success: true,
                data: {
                    transactions,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit),
                        hasNext: page * limit < total,
                        hasPrev: page > 1
                    },
                    summary: {
                        totalAmount: summary._sum.amount || 0,
                        averageAmount: summary._avg.amount || 0,
                        count: summary._count._all
                    }
                },
                message: 'Transactions retrieved successfully'
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to retrieve transactions',
                error: error
            };
        }
    }
    async getGroupTransactionStats(groupId, period) {
        try {
            const now = new Date();
            let startDate;
            switch (period) {
                case 'day':
                    startDate = new Date(now.setDate(now.getDate() - 1));
                    break;
                case 'week':
                    startDate = new Date(now.setDate(now.getDate() - 7));
                    break;
                case 'month':
                    startDate = new Date(now.setMonth(now.getMonth() - 1));
                    break;
                case 'year':
                    startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                    break;
                default:
                    startDate = new Date(0);
            }
            const transactions = await prisma.transaction.findMany({
                where: {
                    stokvelGroupId: groupId,
                    transactionDate: {
                        gte: startDate
                    }
                },
                select: {
                    transactionType: true,
                    amount: true,
                    status: true
                }
            });
            const stats = {
                total: transactions.length,
                byType: {},
                byStatus: {},
                totalAmount: 0,
                pendingAmount: 0,
                completedAmount: 0
            };
            transactions.forEach(transaction => {
                if (!stats.byType[transaction.transactionType]) {
                    stats.byType[transaction.transactionType] = {
                        count: 0,
                        amount: 0
                    };
                }
                stats.byType[transaction.transactionType].count++;
                stats.byType[transaction.transactionType].amount += transaction.amount;
                if (!stats.byStatus[transaction.status]) {
                    stats.byStatus[transaction.status] = {
                        count: 0,
                        amount: 0
                    };
                }
                stats.byStatus[transaction.status].count++;
                stats.byStatus[transaction.status].amount += transaction.amount;
                stats.totalAmount += transaction.amount;
                if (transaction.status === enums_1.TransactionStatus.PENDING) {
                    stats.pendingAmount += transaction.amount;
                }
                else if (transaction.status === enums_1.TransactionStatus.COMPLETED) {
                    stats.completedAmount += transaction.amount;
                }
            });
            const topContributors = await prisma.transaction.groupBy({
                by: ['memberId'],
                where: {
                    stokvelGroupId: groupId,
                    transactionType: enums_1.TransactionType.CONTRIBUTION,
                    status: enums_1.TransactionStatus.COMPLETED
                },
                _sum: {
                    amount: true
                },
                orderBy: {
                    _sum: {
                        amount: 'desc'
                    }
                },
                take: 5
            });
            const topContributorsWithDetails = await Promise.all(topContributors.map(async (contributor) => {
                if (!contributor.memberId)
                    return null;
                const member = await prisma.member.findUnique({
                    where: { id: contributor.memberId },
                    include: {
                        user: {
                            select: {
                                fullName: true,
                                phoneNumber: true
                            }
                        }
                    }
                });
                return {
                    memberId: contributor.memberId,
                    amount: contributor._sum.amount || 0,
                    member: member ? {
                        name: member.user.fullName,
                        phone: member.user.phoneNumber
                    } : null
                };
            }));
            const recentTransactions = await prisma.transaction.findMany({
                where: {
                    stokvelGroupId: groupId
                },
                include: {
                    member: {
                        include: {
                            user: {
                                select: {
                                    fullName: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    transactionDate: 'desc'
                },
                take: 10
            });
            return {
                success: true,
                data: {
                    summary: stats,
                    topContributors: topContributorsWithDetails.filter(Boolean),
                    recentTransactions,
                    period: period || 'all'
                },
                message: 'Transaction statistics retrieved successfully'
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to retrieve transaction statistics',
                error: error
            };
        }
    }
    async recordContribution(data, recordedById) {
        try {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const endOfMonth = new Date(startOfMonth);
            endOfMonth.setMonth(endOfMonth.getMonth() + 1);
            endOfMonth.setDate(0);
            const existingContribution = await prisma.transaction.findFirst({
                where: {
                    stokvelGroupId: data.stokvelGroupId,
                    memberId: data.memberId,
                    transactionType: enums_1.TransactionType.CONTRIBUTION,
                    status: enums_1.TransactionStatus.COMPLETED,
                    transactionDate: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                }
            });
            if (existingContribution) {
                return {
                    success: false,
                    message: 'Member has already contributed this month'
                };
            }
            const group = await prisma.stokvelGroup.findUnique({
                where: { id: data.stokvelGroupId },
                select: {
                    contributionAmount: true,
                    currency: true
                }
            });
            if (!group) {
                return {
                    success: false,
                    message: 'Group not found'
                };
            }
            const expectedAmount = group.contributionAmount;
            if (data.amount < expectedAmount) {
                return {
                    success: false,
                    message: `Contribution amount (\${data.amount}) is less than expected (\${expectedAmount})`
                };
            }
            const transaction = await this.createTransaction({
                stokvelGroupId: data.stokvelGroupId,
                memberId: data.memberId,
                transactionType: enums_1.TransactionType.CONTRIBUTION,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                transactionDate: data.transactionDate,
                notes: data.notes || `Monthly contribution for \${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`
            }, recordedById);
            return transaction;
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to record contribution',
                error: error
            };
        }
    }
    async recordPayout(data, recordedById) {
        try {
            const contributions = await prisma.transaction.aggregate({
                where: {
                    stokvelGroupId: data.stokvelGroupId,
                    memberId: data.memberId,
                    transactionType: enums_1.TransactionType.CONTRIBUTION,
                    status: enums_1.TransactionStatus.COMPLETED
                },
                _sum: {
                    amount: true
                }
            });
            const totalContributions = contributions._sum.amount || 0;
            if (data.amount > totalContributions) {
                return {
                    success: false,
                    message: `Payout amount (\${data.amount}) exceeds total contributions (\${totalContributions})`
                };
            }
            const transaction = await this.createTransaction({
                stokvelGroupId: data.stokvelGroupId,
                memberId: data.memberId,
                transactionType: enums_1.TransactionType.PAYOUT,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                transactionDate: data.transactionDate,
                notes: data.notes || 'Group payout'
            }, recordedById);
            return transaction;
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to record payout',
                error: error
            };
        }
    }
    async recordLoan(data, recordedById) {
        try {
            const interestRate = data.interestRate || 10;
            const interestAmount = (data.amount * interestRate) / 100;
            const totalAmount = data.amount + interestAmount;
            const loanTransaction = await this.createTransaction({
                stokvelGroupId: data.stokvelGroupId,
                memberId: data.memberId,
                transactionType: enums_1.TransactionType.LOAN_DISBURSEMENT,
                amount: data.amount,
                paymentMethod: enums_1.PaymentMethod.BANK_TRANSFER,
                transactionDate: new Date(),
                notes: data.notes || `Loan with \${interestRate}% interest. Total repayment: \${totalAmount}. Due: \${data.dueDate.toLocaleDateString()}`,
                metadata: {
                    interestRate,
                    interestAmount,
                    totalRepayment: totalAmount,
                    dueDate: data.dueDate,
                    isLoan: true
                }
            }, recordedById);
            return loanTransaction;
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to record loan',
                error: error
            };
        }
    }
    async recordLoanRepayment(data, recordedById) {
        try {
            const loanTransaction = await prisma.transaction.findUnique({
                where: { id: data.transactionId },
                include: {
                    group: true,
                    member: true
                }
            });
            if (!loanTransaction) {
                return {
                    success: false,
                    message: 'Loan transaction not found'
                };
            }
            if (loanTransaction.transactionType !== enums_1.TransactionType.LOAN_DISBURSEMENT) {
                return {
                    success: false,
                    message: 'Transaction is not a loan'
                };
            }
            const loanMetadata = loanTransaction.metadata;
            const totalRepayment = loanMetadata?.totalRepayment || loanTransaction.amount;
            const previousRepayments = await prisma.transaction.aggregate({
                where: {
                    memberId: loanTransaction.memberId,
                    transactionType: enums_1.TransactionType.LOAN_REPAYMENT,
                    status: enums_1.TransactionStatus.COMPLETED
                },
                _sum: {
                    amount: true
                }
            });
            const totalRepaid = previousRepayments._sum.amount || 0;
            const remainingBalance = totalRepayment - totalRepaid;
            if (data.amount > remainingBalance) {
                return {
                    success: false,
                    message: `Repayment amount (\${data.amount}) exceeds remaining balance (\${remainingBalance})`
                };
            }
            const repaymentTransaction = await this.createTransaction({
                stokvelGroupId: loanTransaction.stokvelGroupId,
                memberId: loanTransaction.memberId,
                transactionType: enums_1.TransactionType.LOAN_REPAYMENT,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                notes: data.notes || `Loan repayment. Remaining balance: \${remainingBalance - data.amount}`
            }, recordedById);
            return {
                success: true,
                data: {
                    repayment: repaymentTransaction.data,
                    remainingBalance: remainingBalance - data.amount,
                    isFullyRepaid: (remainingBalance - data.amount) <= 0
                },
                message: 'Loan repayment recorded successfully'
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to record loan repayment',
                error: error
            };
        }
    }
    async getDashboardData(groupId, userId) {
        try {
            const group = await prisma.stokvelGroup.findUnique({
                where: { id: groupId },
                include: {
                    members: true,
                    transactions: true,
                },
            });
            if (!group) {
                return {
                    success: false,
                    message: 'Group not found',
                };
            }
            const isMember = group.members.some((member) => member.userId === userId);
            if (!isMember) {
                return {
                    success: false,
                    message: 'You are not a member of this group',
                };
            }
            const totalContributions = group.transactions
                .filter((tx) => tx.transactionType === enums_1.TransactionType.CONTRIBUTION)
                .reduce((sum, tx) => sum + tx.amount, 0);
            const totalWithdrawals = group.transactions
                .filter((tx) => tx.transactionType === enums_1.TransactionType.PAYOUT)
                .reduce((sum, tx) => sum + tx.amount, 0);
            return {
                success: true,
                data: {
                    groupName: group.name,
                    totalMembers: group.members.length,
                    totalContributions,
                    totalWithdrawals,
                },
            };
        }
        catch (error) {
            console.error('Get dashboard data error:', error);
            return {
                success: false,
                message: 'Internal server error',
                error: error.message,
            };
        }
    }
}
exports.TransactionService = TransactionService;
//# sourceMappingURL=transaction.service.js.map