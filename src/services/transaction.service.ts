import { PrismaClient } from '@prisma/client';
import { CreateTransactionInput, UpdateTransactionInput, TransactionFilters } from '../models/Transaction.model';
import { TransactionType, TransactionStatus, PaymentMethod } from '../utils/enums';

const prisma = new PrismaClient();

export class TransactionService {
  /**
   * Generate a unique reference number
   */
  private generateReferenceNumber(): string {
    return `STK-
      ${Date.now().toString(36)}-
      ${Math.random().toString(36).substring(2, 8)}`.toUpperCase(); // Removed unused variables
  }

  /**
   * Create a new transaction - SECURE: Verifies recorder is a group member with appropriate role
   */
  async createTransaction(data: CreateTransactionInput, recordedById: string) {
    try {
      // Validate the group exists
      const group = await prisma.stokvelGroup.findUnique({
        where: { id: data.stokvelGroupId }
      });

      if (!group) {
        return {
          success: false,
          message: 'Group not found'
        };
      }

      // SECURITY: Verify the recorder is a member of the group
      const recorderMembership = await prisma.member.findFirst({
        where: {
          userId: recordedById,
          stokvelGroupId: data.stokvelGroupId
        }
      });

      if (!recorderMembership) {
        return {
          success: false,
          message: 'You are not a member of this group'
        };
      }

      // SECURITY: Only TREASURER, CHAIRPERSON, or SECRETARY can record transactions
      if (!['TREASURER', 'CHAIRPERSON', 'SECRETARY'].includes(recorderMembership.role)) {
        return {
          success: false,
          message: 'Only group officers (Treasurer, Chairperson, or Secretary) can record transactions'
        };
      }

      // Validate the member exists and belongs to the group
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

      // Generate reference number if not provided
      const referenceNumber = data.referenceNumber || this.generateReferenceNumber();

      // Create the transaction
      const transaction = await prisma.transaction.create({
        data: {
          ...data,
          referenceNumber,
          recordedById,
          currency: (data as any).currency || group.currency,
          transactionDate: data.transactionDate || new Date(),
          status: TransactionStatus.PENDING,
          transactionType: Object.values(TransactionType).includes(data.transactionType as TransactionType) ? data.transactionType as TransactionType : TransactionType.CONTRIBUTION, // Validate and cast transactionType
          paymentMethod: Object.values(PaymentMethod).includes(data.paymentMethod as PaymentMethod) ? data.paymentMethod as PaymentMethod : PaymentMethod.CASH // Validate and cast paymentMethod
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

      // If this is a contribution and it's completed, update member balance
      if (data.transactionType === TransactionType.CONTRIBUTION && (data as any).status === TransactionStatus.COMPLETED) {
        // Note: In a real app, we would have a balance field to update
        // For now, we'll just log it
        console.log(`Contribution of \${data.amount} recorded for member \${data.memberId}`);
      }

      return {
        success: true,
        data: transaction,
        message: 'Transaction created successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create transaction',
        error: error
      };
    }
  }

  /**
   * Get transaction by ID - SECURE: Verifies user has access
   */
  async getTransactionById(id: string, userId?: string) {
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

      // If userId provided, verify user has access to this transaction
      if (userId) {
        const membership = await prisma.member.findFirst({
          where: {
            userId,
            stokvelGroupId: transaction.stokvelGroupId
          }
        });

        if (!membership) {
          return {
            success: false,
            message: 'You do not have access to this transaction'
          };
        }
      }

      return {
        success: true,
        data: transaction,
        message: 'Transaction retrieved successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve transaction',
        error: error
      };
    }
  }

  /**
   * Update transaction - SECURE: Verifies user has access (must be group member or recorder)
   */
  async updateTransaction(id: string, data: UpdateTransactionInput, updatedById: string) {
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

      // Verify user has access - must be a member of the group or the recorder
      const membership = await prisma.member.findFirst({
        where: {
          userId: updatedById,
          stokvelGroupId: transaction.stokvelGroupId
        }
      });

      const isRecorder = transaction.recordedById === updatedById;

      if (!membership && !isRecorder) {
        return {
          success: false,
          message: 'You do not have permission to update this transaction'
        };
      }

      // Only TREASURER, CHAIRPERSON, or SECRETARY can update transactions (or the original recorder)
      if (membership && !['TREASURER', 'CHAIRPERSON', 'SECRETARY'].includes(membership.role) && !isRecorder) {
        return {
          success: false,
          message: 'Only group officers can update transactions'
        };
      }

      // If updating status to COMPLETED, set paidDate
      const updateData: any = { ...data };
      if ((data as any).status === TransactionStatus.COMPLETED && transaction.status !== TransactionStatus.COMPLETED) {
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
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update transaction',
        error: error
      };
    }
  }

  /**
   * Get transactions with filters
   */
  async getTransactions(filters: TransactionFilters, page: number = 1, limit: number = 20) {
    try {
      const whereClause: any = {};

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

      // Calculate summary statistics
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
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve transactions',
        error: error
      };
    }
  }

  /**
   * Get transaction statistics for a group
   */
  async getGroupTransactionStats(groupId: string, period?: 'day' | 'week' | 'month' | 'year') {
    try {
      const now = new Date();
      let startDate: Date;

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
          startDate = new Date(0); // Beginning of time
      }

      // Get transaction counts by type
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

      // Calculate statistics
      const stats: any = {
        total: transactions.length,
        byType: {},
        byStatus: {},
        totalAmount: 0,
        pendingAmount: 0,
        completedAmount: 0
      };

      transactions.forEach(transaction => {
        // Count by type
        if (!stats.byType[transaction.transactionType]) {
          stats.byType[transaction.transactionType] = {
            count: 0,
            amount: 0
          };
        }
        stats.byType[transaction.transactionType].count++;
        stats.byType[transaction.transactionType].amount += transaction.amount;

        // Count by status
        if (!stats.byStatus[transaction.status]) {
          stats.byStatus[transaction.status] = {
            count: 0,
            amount: 0
          };
        }
        stats.byStatus[transaction.status].count++;
        stats.byStatus[transaction.status].amount += transaction.amount;

        // Total amounts
        stats.totalAmount += transaction.amount;

        if (transaction.status === TransactionStatus.PENDING) {
          stats.pendingAmount += transaction.amount;
        } else if (transaction.status === TransactionStatus.COMPLETED) {
          stats.completedAmount += transaction.amount;
        }
      });

      // Get top contributors
      const topContributors = await prisma.transaction.groupBy({
        by: ['memberId'],
        where: {
          stokvelGroupId: groupId,
          transactionType: TransactionType.CONTRIBUTION,
          status: TransactionStatus.COMPLETED
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

      // Get member details for top contributors
      const topContributorsWithDetails = await Promise.all(
        topContributors.map(async (contributor) => {
          if (!contributor.memberId) return null;
          
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
        })
      );

      // Get recent transactions
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
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve transaction statistics',
        error: error
      };
    }
  }

  /**
   * Record a contribution payment
   */
  async recordContribution(data: {
    stokvelGroupId: string;
    memberId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    transactionDate?: Date;
    notes?: string;
  }, recordedById: string) {
    try {
      // Check if member has already contributed this month
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
          transactionType: TransactionType.CONTRIBUTION,
          status: TransactionStatus.COMPLETED,
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

      // Get group to check contribution amount
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

      // Check if amount matches expected contribution
      const expectedAmount = group.contributionAmount;
      if (data.amount < expectedAmount) {
        return {
          success: false,
          message: `Contribution amount (\${data.amount}) is less than expected (\${expectedAmount})`
        };
      }

      // Create the contribution transaction
      const transaction = await this.createTransaction({
        stokvelGroupId: data.stokvelGroupId,
        memberId: data.memberId,
        transactionType: TransactionType.CONTRIBUTION,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        transactionDate: data.transactionDate,
        notes: data.notes || `Monthly contribution for \${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`
      }, recordedById);

      return transaction;
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to record contribution',
        error: error
      };
    }
  }

  /**
   * Record a payout to a member
   */
  async recordPayout(data: {
    stokvelGroupId: string;
    memberId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    transactionDate?: Date;
    notes?: string;
  }, recordedById: string) {
    try {
      // Get member's total contributions
      const contributions = await prisma.transaction.aggregate({
        where: {
          stokvelGroupId: data.stokvelGroupId,
          memberId: data.memberId,
          transactionType: TransactionType.CONTRIBUTION,
          status: TransactionStatus.COMPLETED
        },
        _sum: {
          amount: true
        }
      });

      const totalContributions = contributions._sum.amount || 0;

      // Check if payout amount is valid
      if (data.amount > totalContributions) {
        return {
          success: false,
          message: `Payout amount (\${data.amount}) exceeds total contributions (\${totalContributions})`
        };
      }

      // Create the payout transaction
      const transaction = await this.createTransaction({
        stokvelGroupId: data.stokvelGroupId,
        memberId: data.memberId,
        transactionType: TransactionType.PAYOUT,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        transactionDate: data.transactionDate,
        notes: data.notes || 'Group payout'
      }, recordedById);

      return transaction;
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to record payout',
        error: error
      };
    }
  }

  /**
   * Record a loan disbursement
   */
  async recordLoan(data: {
    stokvelGroupId: string;
    memberId: string;
    amount: number;
    interestRate?: number;
    dueDate: Date;
    notes?: string;
  }, recordedById: string) {
    try {
      // Calculate total with interest
      const interestRate = data.interestRate || 10; // Default 10% interest
      const interestAmount = (data.amount * interestRate) / 100;
      const totalAmount = data.amount + interestAmount;

      // Create loan disbursement transaction
      const loanTransaction = await this.createTransaction({
        stokvelGroupId: data.stokvelGroupId,
        memberId: data.memberId,
        transactionType: TransactionType.LOAN_DISBURSEMENT,
        amount: data.amount,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
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
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to record loan',
        error: error
      };
    }
  }

  /**
   * Record a loan repayment
   */
  async recordLoanRepayment(data: {
    transactionId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }, recordedById: string) {
    try {
      // Get the original loan transaction
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

      if (loanTransaction.transactionType !== TransactionType.LOAN_DISBURSEMENT) {
        return {
          success: false,
          message: 'Transaction is not a loan'
        };
      }

      // Get loan metadata
      const loanMetadata = loanTransaction.metadata as any;
      const totalRepayment = loanMetadata?.totalRepayment || loanTransaction.amount;

      // Calculate remaining balance
      const previousRepayments = await prisma.transaction.aggregate({
        where: {
          memberId: loanTransaction.memberId,
          transactionType: TransactionType.LOAN_REPAYMENT,
          status: TransactionStatus.COMPLETED
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

      // Create repayment transaction
      const repaymentTransaction = await this.createTransaction({
        stokvelGroupId: loanTransaction.stokvelGroupId,
        memberId: loanTransaction.memberId,
        transactionType: TransactionType.LOAN_REPAYMENT,
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
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to record loan repayment',
        error: error
      };
    }
  }

  /**
   * Get transactions for groups where user is a member (SECURE)
   * This ensures users can only see transactions from groups they belong to
   */
  async getUserTransactions(userId: string, filters: any = {}, page: number = 1, limit: number = 20) {
    try {
      // First get all groups where user is a member
      const userMemberships = await prisma.member.findMany({
        where: { userId },
        select: { stokvelGroupId: true, id: true }
      });

      if (userMemberships.length === 0) {
        return {
          success: true,
          data: {
            transactions: [],
            pagination: {
              page,
              limit,
              total: 0,
              pages: 0,
              hasNext: false,
              hasPrev: false
            },
            summary: {
              totalAmount: 0,
              averageAmount: 0,
              count: 0
            }
          },
          message: 'No groups found for user'
        };
      }

      const groupIds = userMemberships.map(m => m.stokvelGroupId);
      const memberIds = userMemberships.map(m => m.id);

      // Build where clause - ALWAYS filter by user's groups
      const whereClause: any = {
        OR: [
          { stokvelGroupId: { in: groupIds } }, // Transactions in user's groups
          { memberId: { in: memberIds } } // Or transactions where user is the member
        ]
      };

      // Apply additional filters
      if (filters.stokvelGroupId) {
        // Verify user is a member of this group
        if (!groupIds.includes(filters.stokvelGroupId)) {
          return {
            success: false,
            message: 'You are not a member of this group'
          };
        }
        whereClause.stokvelGroupId = filters.stokvelGroupId;
        delete whereClause.OR;
      }

      if (filters.transactionType) {
        whereClause.transactionType = filters.transactionType;
      }

      if (filters.status) {
        whereClause.status = filters.status;
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

      // Calculate summary statistics
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
        message: 'User transactions retrieved successfully'
      };

    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve user transactions',
        error: error
      };
    }
  }

  /**
   * Get dashboard data for a specific group
   */
  async getDashboardData(groupId: string, userId: string) {
    try {
      // Validate the group exists
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

      // Check if the user is a member of the group
      const isMember = group.members.some((member) => member.userId === userId);

      if (!isMember) {
        return {
          success: false,
          message: 'You are not a member of this group',
        };
      }

      // Calculate dashboard data (example: total contributions, total withdrawals, etc.)
      const totalContributions = group.transactions
        .filter((tx) => tx.transactionType === TransactionType.CONTRIBUTION)
        .reduce((sum, tx) => sum + tx.amount, 0);

      const totalWithdrawals = group.transactions
        .filter((tx) => tx.transactionType === TransactionType.PAYOUT)
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
    } catch (error: any) {
      console.error('Get dashboard data error:', error);
      return {
        success: false,
        message: 'Internal server error',
        error: error.message,
      };
    }
  }
}


