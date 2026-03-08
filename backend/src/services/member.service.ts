import { MemberRole } from '@prisma/client';
import { CreateMemberInput, UpdateMemberInput } from '../models/Member.model';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import { cache } from '../utils/cache';

export class MemberService {
  async addMember(data: CreateMemberInput, invitedById?: string) {
    try {
    const user = await prisma.user.findUnique({
      where: { id: data.userId }
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    const group = await prisma.stokvelGroup.findUnique({
      where: { id: data.stokvelGroupId }
    });

    if (!group) {
      return {
        success: false,
        message: 'Group not found'
      };
    }

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

    const roleValue = data.role && Object.values(MemberRole).includes(data.role as MemberRole)
      ? (data.role as MemberRole)
      : MemberRole.MEMBER;

    // ATOMIC: Create member and audit transaction together
    const result = await prisma.$transaction(async (tx: any) => {
      // Calculate payout order for ROTATING groups: place new member at end of queue
      let payoutOrder: number | undefined;
      if (group.payoutModel === 'ROTATING') {
        const maxOrder = await tx.member.aggregate({
          where: { stokvelGroupId: data.stokvelGroupId },
          _max: { nextPayoutOrder: true },
        });
        payoutOrder = (maxOrder._max.nextPayoutOrder || 0) + 1;
      }

      const member = await tx.member.create({
        data: {
          userId: data.userId,
          stokvelGroupId: data.stokvelGroupId,
          role: roleValue,
          ...(payoutOrder !== undefined && { nextPayoutOrder: payoutOrder }),
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

      await tx.transaction.create({
        data: {
          stokvelGroupId: data.stokvelGroupId,
          memberId: member.id,
          transactionType: 'ADJUSTMENT',
          amount: 0,
          currency: group.currency,
          paymentMethod: 'BANK_TRANSFER',
          transactionDate: new Date(),
          recordedById: invitedById || data.userId,
          status: 'COMPLETED',
          notes: `${user.fullName} joined the group`
        }
      });

      return member;
    });

    // Invalidate group and user caches after member addition
    await cache.invalidateGroup(data.stokvelGroupId);
    await cache.invalidateUserGroups(data.userId);

    return {
      success: true,
      data: result,
      message: 'Member added successfully'
    };
    } catch (error: any) {
      logger.error('addMember error:', error);
      return {
        success: false,
        message: error.message || 'Failed to add member'
      };
    }
  }

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
      logger.error('getMemberById error:', error);
      return { success: false, message: error.message || 'Failed to retrieve member' };
    }
  }

  async updateMember(id: string, data: UpdateMemberInput) {
    try {
    const { role, ...rest } = data;
    
    const roleValue = role && Object.values(MemberRole).includes(role as MemberRole)
      ? (role as MemberRole)
      : undefined;

    if (role && !roleValue) {
      return { success: false, message: 'Invalid role' };
    }

    const member = await prisma.member.update({
      where: { id },
      data: {
        ...rest,
        ...(roleValue ? { role: roleValue } : {})
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
      logger.error('updateMember error:', error);
      return { success: false, message: error.message || 'Failed to update member' };
    }
  }

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

    // END_OF_TERM POLICY: Calculate member's contribution total for the removal audit
    let memberContributionTotal = 0;
    if (member.group.payoutModel === 'END_OF_TERM') {
      const contributions = await prisma.transaction.aggregate({
        where: {
          memberId: id,
          stokvelGroupId: member.stokvelGroupId,
          transactionType: 'CONTRIBUTION',
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      });
      memberContributionTotal = Number(contributions._sum.amount || 0);
    }

    // ATOMIC: Create audit transaction, delete member, and resequence payout order
    await prisma.$transaction(async (tx: any) => {
      // For END_OF_TERM groups: Record the member's forfeited contribution as an adjustment note
      // Policy: Contributions stay in the pool until term end. Early leavers' funds are distributed
      // equally among remaining members at term end. SuperAdmin can create manual adjustment if refund needed.
      const removalNote = member.group.payoutModel === 'END_OF_TERM' && memberContributionTotal > 0
        ? `${member.user.fullName} removed from END_OF_TERM group. Their R${memberContributionTotal.toFixed(2)} in contributions remains in the pool for distribution at term end. SuperAdmin can issue manual refund if needed.`
        : `${member.user.fullName} was removed from the group`;

      await tx.transaction.create({
        data: {
          stokvelGroupId: member.stokvelGroupId,
          memberId: id,
          transactionType: 'ADJUSTMENT',
          amount: memberContributionTotal,
          currency: member.group.currency,
          paymentMethod: 'BANK_TRANSFER',
          transactionDate: new Date(),
          recordedById: removedById,
          status: 'COMPLETED',
          notes: removalNote
        }
      });

      await tx.member.delete({
        where: { id }
      });

      // Resequence payout order for remaining members (ROTATING groups)
      if (member.group.payoutModel === 'ROTATING') {
        const remainingMembers = await tx.member.findMany({
          where: { stokvelGroupId: member.stokvelGroupId },
          orderBy: { nextPayoutOrder: 'asc' },
        });
        for (let i = 0; i < remainingMembers.length; i++) {
          await tx.member.update({
            where: { id: remainingMembers[i].id },
            data: { nextPayoutOrder: i + 1 },
          });
        }
      }
    });

    // Invalidate group and user caches after member removal
    await cache.invalidateGroup(member.stokvelGroupId);
    await cache.invalidateUserGroups(member.user.id);

    return {
      success: true,
      message: member.group.payoutModel === 'END_OF_TERM' && memberContributionTotal > 0
        ? `Member removed. Their R${memberContributionTotal.toFixed(2)} in contributions remains in the pool until term end.`
        : 'Member removed successfully'
    };
    } catch (error: any) {
      logger.error('removeMember error:', error);
      return { success: false, message: error.message || 'Failed to remove member' };
    }
  }

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

    const memberIds = members.map((m: any) => m.id);

    // BATCH: Single groupBy query instead of N+1 individual queries
    const [contributionStats, payoutStats] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['memberId'],
        where: {
          memberId: { in: memberIds },
          status: 'COMPLETED',
          transactionType: 'CONTRIBUTION'
        },
        _sum: { amount: true }
      }),
      prisma.transaction.groupBy({
        by: ['memberId'],
        where: {
          memberId: { in: memberIds },
          status: 'COMPLETED',
          transactionType: 'PAYOUT'
        },
        _sum: { amount: true }
      })
    ]);

    const contribMap = new Map<string, number>(contributionStats.map((s: any) => [s.memberId, Number(s._sum.amount || 0)]));
    const payoutMap = new Map<string, number>(payoutStats.map((s: any) => [s.memberId, Number(s._sum.amount || 0)]));

    const membersWithStats = members.map((member: any) => {
      const totalContributions: number = contribMap.get(member.id) || 0;
      const totalPayouts: number = payoutMap.get(member.id) || 0;
      return {
        ...member,
        stats: {
          totalContributions,
          totalPayouts,
          balance: Number(totalContributions) - Number(totalPayouts)
        }
      };
    });

    return {
      success: true,
      data: membersWithStats,
      message: 'Group members retrieved successfully'
    };
    } catch (error: any) {
      logger.error('getGroupMembers error:', error);
      return { success: false, message: error.message || 'Failed to retrieve group members' };
    }
  }

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

    // DB-LEVEL AGGREGATION instead of loading all transactions into memory
    const [contributionAgg, payoutAgg, pendingAgg, totalCount, lastContribution, recentTransactions] = await Promise.all([
      prisma.transaction.aggregate({
        where: { memberId, transactionType: 'CONTRIBUTION' },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { memberId, transactionType: 'PAYOUT' },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { memberId, transactionType: 'CONTRIBUTION', status: 'PENDING' },
        _sum: { amount: true }
      }),
      prisma.transaction.count({ where: { memberId } }),
      prisma.transaction.findFirst({
        where: { memberId, transactionType: 'CONTRIBUTION' },
        orderBy: { transactionDate: 'desc' },
        select: { transactionDate: true }
      }),
      prisma.transaction.findMany({
        where: { memberId },
        orderBy: { transactionDate: 'desc' },
        take: 5
      })
    ]);

    const totalContributions = Number(contributionAgg._sum.amount || 0);
    const totalPayouts = Number(payoutAgg._sum.amount || 0);
    const pendingAmount = Number(pendingAgg._sum.amount || 0);
    const currentBalance = totalContributions - totalPayouts;

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
          pendingAmount,
          lastContributionDate: lastContribution?.transactionDate || null,
          totalTransactions: totalCount
        },
        recentTransactions
      },
      message: 'Member statistics retrieved successfully'
    };
    } catch (error: any) {
      logger.error('getMemberStats error:', error);
      return { success: false, message: error.message || 'Failed to retrieve member stats' };
    }
  }

  async joinGroupWithCode(userId: string, code: string) {
    try {
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

    const member = await this.addMember({
      userId,
      stokvelGroupId: group.id,
      role: MemberRole.MEMBER
    }, userId);

    return member;
    } catch (error: any) {
      logger.error('joinGroupWithCode error:', error);
      return { success: false, message: error.message || 'Failed to join group' };
    }
  }

  /**
   * Get all group memberships for a user
   */
  async getUserMemberships(userId: string) {
    try {
    const memberships = await prisma.member.findMany({
      where: { userId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            contributionAmount: true,
            contributionFrequency: true,
            currency: true,
            isActive: true,
            code: true,
          }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
          }
        },
        _count: {
          select: { transactions: true }
        }
      }
    });

    return {
      success: true,
      data: memberships,
      message: `Found ${memberships.length} memberships`
    };
    } catch (error: any) {
      logger.error('getUserMemberships error:', error);
      return { success: false, message: error.message || 'Failed to retrieve memberships' };
    }
  }
}


