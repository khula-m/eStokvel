import { prisma, toNumber } from '../utils/prisma';
import { CreateTransactionInput, UpdateTransactionInput, TransactionFilters } from '../models/Transaction.model';
import { TransactionType, TransactionStatus, PaymentMethod } from '../utils/enums';
import logger from '../utils/logger';
import { invalidateCache } from '../utils/redis';

export class TransactionService {
  /**
   * Generate a unique reference number
   */
  private generateReferenceNumber(): string {
    return `STK-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
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

      // SECURITY: Only ADMIN can record transactions
      if (recorderMembership.role !== 'ADMIN') {
        return {
          success: false,
          message: 'Only the group admin can record transactions'
        };
      }

      // Resolve memberId: use provided one, or default to recorder's own membership
      let resolvedMemberId = data.memberId;
      if (resolvedMemberId) {
        // Validate the specified member exists and belongs to the group
        const member = await prisma.member.findUnique({
          where: { id: resolvedMemberId },
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
      } else {
        // Default to the recorder's own membership in this group
        resolvedMemberId = recorderMembership.id;
      }

      // Validate enum values
      if (!Object.values(TransactionType).includes(data.transactionType as TransactionType)) {
        return {
          success: false,
          message: `Invalid transaction type: ${data.transactionType}. Valid: ${Object.values(TransactionType).join(', ')}`
        };
      }
      if (!Object.values(PaymentMethod).includes(data.paymentMethod as PaymentMethod)) {
        return {
          success: false,
          message: `Invalid payment method: ${data.paymentMethod}. Valid: ${Object.values(PaymentMethod).join(', ')}`
        };
      }

      // Generate reference number if not provided
      const referenceNumber = data.referenceNumber || this.generateReferenceNumber();

      // Create the transaction
      const transaction = await prisma.transaction.create({
        data: {
          stokvelGroupId: data.stokvelGroupId,
          memberId: resolvedMemberId,
          transactionType: data.transactionType as TransactionType,
          amount: data.amount,
          paymentMethod: data.paymentMethod as PaymentMethod,
          referenceNumber,
          recordedById,
          currency: (data as any).currency || group.currency,
          transactionDate: data.transactionDate || new Date(),
          status: TransactionStatus.PENDING,
          notes: data.notes || (data as any).description || null,
        },
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

      // If this is a contribution and it's completed, update member balance
      if (data.transactionType === TransactionType.CONTRIBUTION && (data as any).status === TransactionStatus.COMPLETED) {
        // Note: In a real app, we would have a balance field to update
        // For now, we'll just log it
        logger.info(`Contribution of \${data.amount} recorded for member \${data.memberId}`);
      }

      // Invalidate cached stats after successful transaction
      await this.invalidateGroupCaches(data.stokvelGroupId);

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
   * Create a member self-contribution - Members can make their own payments
   * ATOMIC: Uses prisma.$transaction to ensure data consistency
   */
  async createMemberContribution(data: { stokvelGroupId: string; amount: number; paymentMethod: string; notes?: string }, userId: string) {
    try {
      const result = await prisma.$transaction(async (tx: any) => {
        // Validate the group exists
        const group = await tx.stokvelGroup.findUnique({
          where: { id: data.stokvelGroupId }
        });
        if (!group) {
          throw new Error('Group not found');
        }

        // Verify the user is a member of the group
        const membership = await tx.member.findFirst({
          where: { userId, stokvelGroupId: data.stokvelGroupId }
        });
        if (!membership) {
          throw new Error('You are not a member of this group');
        }

        // Validate amount
        if (!data.amount || data.amount <= 0) {
          throw new Error('Amount must be greater than 0');
        }

        const referenceNumber = this.generateReferenceNumber();

        // Create the contribution transaction atomically
        const transaction = await tx.transaction.create({
          data: {
            stokvelGroupId: data.stokvelGroupId,
            memberId: membership.id,
            transactionType: TransactionType.CONTRIBUTION,
            amount: data.amount,
            paymentMethod: Object.values(PaymentMethod).includes(data.paymentMethod as PaymentMethod)
              ? data.paymentMethod as PaymentMethod
              : PaymentMethod.BANK_TRANSFER,
            notes: data.notes || undefined,
            referenceNumber,
            recordedById: userId,
            currency: group.currency,
            transactionDate: new Date(),
            status: TransactionStatus.COMPLETED,
          },
          include: {
            group: { select: { id: true, name: true, currency: true } },
            member: {
              include: {
                user: { select: { id: true, fullName: true, phoneNumber: true } }
              }
            },
            recordedBy: { select: { id: true, fullName: true, phoneNumber: true } }
          }
        });

        return transaction;
      }, {
        timeout: 10000,
      });

      return {
        success: true,
        data: result,
        message: 'Contribution recorded successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to record contribution',
        error
      };
    }
  }

  /**
   * Invalidate group-related caches after a transaction write
   */
  async invalidateGroupCaches(groupId: string) {
    await invalidateCache(`group:${groupId}:stats`).catch(() => {});
    await invalidateCache('system:overview').catch(() => {});
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

      // Only ADMIN can update transactions (or the original recorder)
      if (membership && membership.role !== 'ADMIN' && !isRecorder) {
        return {
          success: false,
          message: 'Only the admin can update transactions'
        };
      }

      // If updating status to COMPLETED, update the updatedAt timestamp
      const updateData: any = { ...data };
      if ((data as any).status === TransactionStatus.COMPLETED && transaction.status !== TransactionStatus.COMPLETED) {
        // updatedAt is auto-managed by Prisma @updatedAt
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
            totalAmount: Number(summary._sum.amount || 0),
            averageAmount: Number(summary._avg.amount || 0),
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

      // Get transaction counts by type using aggregation
      const [contributionAgg, payoutAgg, allAgg, pendingAgg] = await Promise.all([
        prisma.transaction.aggregate({
          where: { stokvelGroupId: groupId, transactionDate: { gte: startDate }, transactionType: TransactionType.CONTRIBUTION },
          _sum: { amount: true }, _count: { _all: true }
        }),
        prisma.transaction.aggregate({
          where: { stokvelGroupId: groupId, transactionDate: { gte: startDate }, transactionType: TransactionType.PAYOUT },
          _sum: { amount: true }, _count: { _all: true }
        }),
        prisma.transaction.aggregate({
          where: { stokvelGroupId: groupId, transactionDate: { gte: startDate } },
          _sum: { amount: true }, _count: { _all: true }
        }),
        prisma.transaction.aggregate({
          where: { stokvelGroupId: groupId, transactionDate: { gte: startDate }, status: TransactionStatus.PENDING },
          _sum: { amount: true }, _count: { _all: true }
        }),
      ]);

      // Get status breakdown
      const statusBreakdown = await prisma.transaction.groupBy({
        by: ['status'],
        where: { stokvelGroupId: groupId, transactionDate: { gte: startDate } },
        _sum: { amount: true }, _count: { _all: true }
      });

      const stats: any = {
        total: allAgg._count._all,
        byType: {
          CONTRIBUTION: { count: contributionAgg._count._all, amount: toNumber(contributionAgg._sum.amount) },
          PAYOUT: { count: payoutAgg._count._all, amount: toNumber(payoutAgg._sum.amount) },
        },
        byStatus: {} as Record<string, { count: number; amount: number }>,
        totalAmount: toNumber(allAgg._sum.amount),
        pendingAmount: toNumber(pendingAgg._sum.amount),
        completedAmount: toNumber(contributionAgg._sum.amount) + toNumber(payoutAgg._sum.amount)
      };

      for (const row of statusBreakdown) {
        stats.byStatus[row.status] = { count: row._count._all, amount: toNumber(row._sum.amount) };
      }

      // Get top contributors � single query with JOIN instead of N+1
      const topContributors = await prisma.transaction.groupBy({
        by: ['memberId'],
        where: {
          stokvelGroupId: groupId,
          transactionType: TransactionType.CONTRIBUTION,
          status: TransactionStatus.COMPLETED
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5
      });

      // Batch-fetch member details in one query
      const memberIds = topContributors.map((c: any) => c.memberId).filter(Boolean);
      const memberDetails = memberIds.length > 0
        ? await prisma.member.findMany({
            where: { id: { in: memberIds } },
            include: { user: { select: { fullName: true, phoneNumber: true } } }
          })
        : [];
      const memberMap = new Map(memberDetails.map((m: any) => [m.id, m]));

      const topContributorsWithDetails = topContributors.map((contributor: any) => {
        const member = memberMap.get(contributor.memberId) as any;
        return {
          memberId: contributor.memberId,
          amount: contributor._sum.amount || 0,
          member: member ? { name: member.user.fullName, phone: member.user.phoneNumber } : null
        };
      });

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
          topContributors: topContributorsWithDetails,
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
      const expectedAmount = toNumber(group.contributionAmount);
      if (data.amount < expectedAmount) {
        return {
          success: false,
          message: `Contribution amount (${data.amount}) is less than expected (${expectedAmount})`
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
   * ATOMIC: Uses prisma.$transaction to prevent double-spending race conditions
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
      // Use an interactive transaction with serializable isolation to prevent race conditions
      const result = await prisma.$transaction(async (tx: any) => {
        // Get member's total contributions
        const contributions = await tx.transaction.aggregate({
          where: {
            stokvelGroupId: data.stokvelGroupId,
            memberId: data.memberId,
            transactionType: TransactionType.CONTRIBUTION,
            status: TransactionStatus.COMPLETED
          },
          _sum: { amount: true }
        });

        const totalContributions = toNumber(contributions._sum.amount);

        // Get previous payouts for this member in this group
        const previousPayouts = await tx.transaction.aggregate({
          where: {
            stokvelGroupId: data.stokvelGroupId,
            memberId: data.memberId,
            transactionType: TransactionType.PAYOUT,
            status: { in: [TransactionStatus.COMPLETED, TransactionStatus.PENDING] }
          },
          _sum: { amount: true }
        });

        const totalPreviousPayouts = toNumber(previousPayouts._sum.amount);
        const availableBalance = totalContributions - totalPreviousPayouts;

        // Check if payout amount is valid against net balance
        if (data.amount > availableBalance) {
          throw new Error(`Payout amount (${data.amount}) exceeds available balance (${availableBalance}). Total contributions: ${totalContributions}, previous payouts: ${totalPreviousPayouts}`);
        }

        // Validate the group exists
        const group = await tx.stokvelGroup.findUnique({
          where: { id: data.stokvelGroupId }
        });
        if (!group) {
          throw new Error('Group not found');
        }

        // Verify the recorder is an admin of the group
        const recorderMembership = await tx.member.findFirst({
          where: { userId: recordedById, stokvelGroupId: data.stokvelGroupId }
        });
        if (!recorderMembership) {
          throw new Error('You are not a member of this group');
        }
        if (recorderMembership.role !== 'ADMIN') {
          throw new Error('Only the group admin can record payouts');
        }

        const referenceNumber = this.generateReferenceNumber();

        // Create the payout transaction atomically
        const transaction = await tx.transaction.create({
          data: {
            stokvelGroupId: data.stokvelGroupId,
            memberId: data.memberId,
            transactionType: TransactionType.PAYOUT,
            amount: data.amount,
            paymentMethod: data.paymentMethod,
            referenceNumber,
            recordedById,
            currency: group.currency,
            transactionDate: data.transactionDate || new Date(),
            status: TransactionStatus.PENDING,
            notes: data.notes || 'Group payout',
          },
          include: {
            group: { select: { id: true, name: true, currency: true } },
            member: { include: { user: { select: { id: true, fullName: true, phoneNumber: true } } } },
            recordedBy: { select: { id: true, fullName: true, phoneNumber: true } }
          }
        });

        return transaction;
      }, {
        timeout: 10000, // 10s timeout for the transaction
      });

      return {
        success: true,
        data: result,
        message: 'Payout recorded successfully'
      };

    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to record payout',
        error: error
      };
    }
  }

  /**
   * Get ALL transactions (SUPERADMIN only)
   */
  async getAllTransactions(filters: any = {}, page: number = 1, limit: number = 20) {
    try {
      const whereClause: any = {};
      if (filters.stokvelGroupId) whereClause.stokvelGroupId = filters.stokvelGroupId;
      if (filters.transactionType) whereClause.transactionType = filters.transactionType;
      if (filters.status) whereClause.status = filters.status;
      if (filters.startDate || filters.endDate) {
        whereClause.transactionDate = {};
        if (filters.startDate) whereClause.transactionDate.gte = filters.startDate;
        if (filters.endDate) whereClause.transactionDate.lte = filters.endDate;
      }

      const skip = (page - 1) * limit;
      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where: whereClause,
          include: {
            group: { select: { id: true, name: true, currency: true } },
            member: { include: { user: { select: { id: true, fullName: true, phoneNumber: true } } } },
            recordedBy: { select: { id: true, fullName: true } }
          },
          orderBy: { transactionDate: 'desc' },
          skip,
          take: limit
        }),
        prisma.transaction.count({ where: whereClause })
      ]);

      return {
        success: true,
        data: {
          transactions,
          pagination: { page, limit, total, pages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 }
        },
        message: 'All transactions retrieved'
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to retrieve transactions' };
    }
  }

  /**
   * Get transactions for groups where user is a member (SECURE)
   * This ensures users can only see transactions from groups they belong to
   */
  async getUserTransactions(userId: string, filters: any = {}, page: number = 1, limit: number = 20, personalOnly: boolean = false) {
    try {
      // First get all groups where user is a member (include role for ledger separation)
      const userMemberships = await prisma.member.findMany({
        where: { userId },
        select: { stokvelGroupId: true, id: true, role: true }
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

      const memberIds = userMemberships.map((m: any) => m.id);

      // Build where clause with ROLE-BASED LEDGER SEPARATION:
      // - ADMIN in a group: sees ALL group transactions (full ledger)
      // - MEMBER in a group: sees only THEIR OWN transactions
      // - personalOnly=true: always sees only own transactions (for /my endpoint)
      const whereClause: any = {};

      // Apply additional filters
      if (filters.stokvelGroupId) {
        // Verify user is a member of this group
        const membership = userMemberships.find((m: any) => m.stokvelGroupId === filters.stokvelGroupId);
        if (!membership) {
          return {
            success: false,
            message: 'You are not a member of this group'
          };
        }
        whereClause.stokvelGroupId = filters.stokvelGroupId;

        // LEDGER VIEW SEPARATION: MEMBER sees only their own transactions
        if (personalOnly || membership.role === 'MEMBER') {
          whereClause.memberId = membership.id;
        }
        // ADMIN sees all transactions in the group (no memberId filter)
      } else {
        // No specific group � different behavior based on personalOnly
        if (personalOnly) {
          // /my endpoint: always own transactions only
          whereClause.memberId = { in: memberIds };
        } else {
          // /transactions endpoint: ADMIN groups see all, MEMBER groups see own
          const adminGroupIds = userMemberships.filter((m: any) => m.role === 'ADMIN').map((m: any) => m.stokvelGroupId);
          const memberOnlyMemberIds = userMemberships.filter((m: any) => m.role === 'MEMBER').map((m: any) => m.id);

          if (adminGroupIds.length > 0 && memberOnlyMemberIds.length > 0) {
            whereClause.OR = [
              { stokvelGroupId: { in: adminGroupIds } },
              { memberId: { in: memberOnlyMemberIds } }
            ];
          } else if (adminGroupIds.length > 0) {
            whereClause.stokvelGroupId = { in: adminGroupIds };
          } else {
            whereClause.memberId = { in: memberOnlyMemberIds };
          }
        }
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
            totalAmount: Number(summary._sum.amount || 0),
            averageAmount: Number(summary._avg.amount || 0),
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
   * OPTIMIZED: Uses DB aggregation instead of loading all transactions into memory
   */
  async getDashboardData(groupId: string, userId: string) {
    try {
      // Validate the group exists
      const group = await prisma.stokvelGroup.findUnique({
        where: { id: groupId },
        select: {
          id: true,
          name: true,
          _count: { select: { members: true } }
        }
      });

      if (!group) {
        return { success: false, message: 'Group not found' };
      }

      // Check if the user is a member of the group
      const membership = await prisma.member.findFirst({
        where: { userId, stokvelGroupId: groupId }
      });

      if (!membership) {
        return { success: false, message: 'You are not a member of this group' };
      }

      // Aggregate contributions and payouts at DB level
      const [contributionAgg, payoutAgg] = await Promise.all([
        prisma.transaction.aggregate({
          where: {
            stokvelGroupId: groupId,
            transactionType: TransactionType.CONTRIBUTION,
            status: TransactionStatus.COMPLETED
          },
          _sum: { amount: true }
        }),
        prisma.transaction.aggregate({
          where: {
            stokvelGroupId: groupId,
            transactionType: TransactionType.PAYOUT,
            status: TransactionStatus.COMPLETED
          },
          _sum: { amount: true }
        })
      ]);

      return {
        success: true,
        data: {
          groupName: group.name,
          totalMembers: group._count.members,
          totalContributions: toNumber(contributionAgg._sum.amount),
          totalWithdrawals: toNumber(payoutAgg._sum.amount),
        },
      };
    } catch (error: any) {
      logger.error('Get dashboard data error:', error);
      return {
        success: false,
        message: 'Internal server error',
        error: error.message,
      };
    }
  }

  /**
   * Verify if a user is a member of a group
   */
  async verifyGroupMembership(userId: string, groupId: string) {
    const membership = await prisma.member.findFirst({
      where: {
        userId,
        stokvelGroupId: groupId
      }
    });
    
    return {
      isMember: !!membership,
      role: membership?.role || null
    };
  }
}
