import { PrismaClient } from '@prisma/client';
import { CreateMemberInput, UpdateMemberInput } from '../models/Member.model';
import { MemberRole, MemberStatus } from '../utils/enums';

const prisma = new PrismaClient();

export class MemberService {
  /**
   * Add a member to a stokvel group
   */
  async addMember(data: CreateMemberInput, invitedById?: string) {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: data.userId }
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Check if group exists
      const group = await prisma.stokvelGroup.findUnique({
        where: { id: data.stokvelGroupId }
      });

      if (!group) {
        return {
          success: false,
          message: 'Group not found'
        };
      }

      // Check if user is already a member
      const existingMember = await prisma.member.findUnique({
        where: {
          userId_stokvelGroupId: {
            userId: data.userId,
            stokvelGroupId: data.stokvelGroupId
          }
        }
      });

      if (existingMember) {
        return {
          success: false,
          message: 'User is already a member of this group'
        };
      }

      // Create the member
      const member = await prisma.member.create({
        data: {
          userId: data.userId,
          stokvelGroupId: data.stokvelGroupId,
          role: data.role || MemberRole.MEMBER
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              email: true
            }
          },
          group: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      });

      // Create a notification transaction
      await prisma.transaction.create({
        data: {
          stokvelGroupId: data.stokvelGroupId,
          memberId: member.id,
          transactionType: 'ADJUSTMENT',
          amount: 0,
          currency: group.currency,
          paymentMethod: 'CASH',
          transactionDate: new Date(),
          recordedById: invitedById || data.userId,
          status: 'COMPLETED',
          notes: \`\${user.fullName} joined the group\`
        }
      });

      return {
        success: true,
        data: member,
        message: 'Member added successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to add member',
        error: error
      };
    }
  }

  /**
   * Get member by ID with details
   */
  async getMemberById(id: string) {
    try {
      const member = await prisma.member.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              email: true,
              createdAt: true
            }
          },
          group: {
            select: {
              id: true,
              name: true,
              code: true,
              currency: true,
              contributionAmount: true
            }
          },
          transactions: {
            take: 10,
            orderBy: {
              transactionDate: 'desc'
            },
            select: {
              id: true,
              transactionType: true,
              amount: true,
              transactionDate: true,
              status: true
            }
          }
        }
      });

      if (!member) {
        return {
          success: false,
          message: 'Member not found'
        };
      }

      return {
        success: true,
        data: member,
        message: 'Member retrieved successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve member',
        error: error
      };
    }
  }

  /**
   * Update member role or status
   */
  async updateMember(id: string, data: UpdateMemberInput) {
    try {
      const member = await prisma.member.update({
        where: { id },
        data: {
          ...data,
          // If we had an updatedAt field, we would update it here
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true
            }
          },
          group: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      return {
        success: true,
        data: member,
        message: 'Member updated successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update member',
        error: error
      };
    }
  }

  /**
   * Remove member from group
   */
  async removeMember(id: string, removedById: string) {
    try {
      const member = await prisma.member.findUnique({
        where: { id },
        include: {
          user: true,
          group: true
        }
      });

      if (!member) {
        return {
          success: false,
          message: 'Member not found'
        };
      }

      // Check if member has pending transactions
      const pendingTransactions = await prisma.transaction.count({
        where: {
          memberId: id,
          status: 'PENDING'
        }
      });

      if (pendingTransactions > 0) {
        return {
          success: false,
          message: 'Cannot remove member with pending transactions'
        };
      }

      // Create a notification before removing
      await prisma.transaction.create({
        data: {
          stokvelGroupId: member.stokvelGroupId,
          memberId: id,
          transactionType: 'ADJUSTMENT',
          amount: 0,
          currency: member.group.currency,
          paymentMethod: 'CASH',
          transactionDate: new Date(),
          recordedById: removedById,
          status: 'COMPLETED',
          notes: \`\${member.user.fullName} was removed from the group\`
        }
      });

      // Remove the member
      await prisma.member.delete({
        where: { id }
      });

      return {
        success: true,
        message: 'Member removed successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to remove member',
        error: error
      };
    }
  }

  /**
   * Get all members of a group
   */
  async getGroupMembers(groupId: string, filters?: {
    role?: string;
    search?: string;
  }) {
    try {
      const whereClause: any = {
        stokvelGroupId: groupId
      };

      if (filters?.role) {
        whereClause.role = filters.role;
      }

      if (filters?.search) {
        whereClause.user = {
          OR: [
            { fullName: { contains: filters.search, mode: 'insensitive' } },
            { phoneNumber: { contains: filters.search } }
          ]
        };
      }

      const members = await prisma.member.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              email: true
            }
          },
          _count: {
            select: {
              transactions: true
            }
          }
        },
        orderBy: {
          joinedAt: 'desc'
        }
      });

      // Get member statistics
      const membersWithStats = await Promise.all(
        members.map(async (member) => {
          const transactions = await prisma.transaction.findMany({
            where: {
              memberId: member.id,
              status: 'COMPLETED'
            },
            select: {
              amount: true,
              transactionType: true
            }
          });

          let totalContributions = 0;
          let totalPayouts = 0;

          transactions.forEach(transaction => {
            if (transaction.transactionType === 'CONTRIBUTION') {
              totalContributions += transaction.amount;
            } else if (transaction.transactionType === 'PAYOUT') {
              totalPayouts += transaction.amount;
            }
          });

          const balance = totalContributions - totalPayouts;

          return {
            ...member,
            stats: {
              totalContributions,
              totalPayouts,
              balance
            }
          };
        })
      );

      return {
        success: true,
        data: membersWithStats,
        message: 'Group members retrieved successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve group members',
        error: error
      };
    }
  }

  /**
   * Get member statistics
   */
  async getMemberStats(memberId: string) {
    try {
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        include: {
          user: {
            select: {
              fullName: true
            }
          },
          group: {
            select: {
              name: true,
              contributionAmount: true,
              contributionFrequency: true
            }
          }
        }
      });

      if (!member) {
        return {
          success: false,
          message: 'Member not found'
        };
      }

      // Get all transactions for this member
      const transactions = await prisma.transaction.findMany({
        where: {
          memberId: memberId
        },
        orderBy: {
          transactionDate: 'desc'
        }
      });

      // Calculate statistics
      let totalContributions = 0;
      let totalPayouts = 0;
      let totalLoans = 0;
      let totalRepayments = 0;
      let pendingAmount = 0;
      let lastContributionDate: Date | null = null;

      transactions.forEach(transaction => {
        switch (transaction.transactionType) {
          case 'CONTRIBUTION':
            totalContributions += transaction.amount;
            if (transaction.status === 'PENDING') {
              pendingAmount += transaction.amount;
            }
            if (!lastContributionDate || transaction.transactionDate > lastContributionDate) {
              lastContributionDate = transaction.transactionDate;
            }
            break;
          case 'PAYOUT':
            totalPayouts += transaction.amount;
            break;
          case 'LOAN_DISBURSEMENT':
            totalLoans += transaction.amount;
            break;
          case 'LOAN_REPAYMENT':
            totalRepayments += transaction.amount;
            break;
        }
      });

      const currentBalance = totalContributions - totalPayouts;
      const outstandingLoan = totalLoans - totalRepayments;

      return {
        success: true,
        data: {
          member: {
            id: member.id,
            name: member.user.fullName,
            role: member.role,
            joinedAt: member.joinedAt
          },
          group: member.group,
          stats: {
            totalContributions,
            totalPayouts,
            currentBalance,
            totalLoans,
            totalRepayments,
            outstandingLoan,
            pendingAmount,
            lastContributionDate,
            totalTransactions: transactions.length
          },
          recentTransactions: transactions.slice(0, 5)
        },
        message: 'Member statistics retrieved successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve member statistics',
        error: error
      };
    }
  }

  /**
   * Join a group using invite code
   */
  async joinGroupWithCode(userId: string, code: string) {
    try {
      // Find group by code
      const group = await prisma.stokvelGroup.findUnique({
        where: { code },
        include: {
          _count: {
            select: {
              members: true
            }
          }
        }
      });

      if (!group) {
        return {
          success: false,
          message: 'Invalid group code'
        };
      }

      if (!group.isActive) {
        return {
          success: false,
          message: 'This group is no longer active'
        };
      }

      // Check if user is already a member
      const existingMember = await prisma.member.findUnique({
        where: {
          userId_stokvelGroupId: {
            userId,
            stokvelGroupId: group.id
          }
        }
      });

      if (existingMember) {
        return {
          success: false,
          message: 'You are already a member of this group'
        };
      }

      // Add user as member
      const member = await this.addMember({
        userId,
        stokvelGroupId: group.id,
        role: MemberRole.MEMBER
      }, userId);

      return member;
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to join group',
        error: error
      };
    }
  }
}
