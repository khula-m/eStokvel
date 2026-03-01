import { MemberRole } from '@prisma/client';
import { CreateMemberInput, UpdateMemberInput } from '../models/Member.model';
import { prisma } from '../utils/prisma';

export class MemberService {
  async addMember(data: CreateMemberInput, invitedById?: string) {
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

    const member = await prisma.member.create({
      data: {
        userId: data.userId,
        stokvelGroupId: data.stokvelGroupId,
        role: roleValue
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
        notes: `${user.fullName} joined the group`
      }
    });

    return {
      success: true,
      data: member,
      message: 'Member added successfully'
    };
  }

  async getMemberById(id: string) {
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
  }

  async updateMember(id: string, data: UpdateMemberInput) {
    const { role, ...rest } = data;
    
    const roleValue = role && Object.values(MemberRole).includes(role as MemberRole)
      ? (role as MemberRole)
      : undefined;

    if (role && !roleValue) {
      throw new Error('Invalid role');
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
  }

  async removeMember(id: string, removedById: string) {
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
        notes: `${member.user.fullName} was removed from the group`
      }
    });

    await prisma.member.delete({
      where: { id }
    });

    return {
      success: true,
      message: 'Member removed successfully'
    };
  }

  async getGroupMembers(groupId: string, filters?: {
    role?: string;
    search?: string;
  }) {
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
            totalContributions += Number(transaction.amount);
          } else if (transaction.transactionType === 'PAYOUT') {
            totalPayouts += Number(transaction.amount);
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
  }

  async getMemberStats(memberId: string) {
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

    const transactions = await prisma.transaction.findMany({
      where: {
        memberId: memberId
      },
      orderBy: {
        transactionDate: 'desc'
      }
    });

    let totalContributions = 0;
    let totalPayouts = 0;
    let pendingAmount = 0;
    let lastContributionDate: Date | null = null;

    transactions.forEach(transaction => {
      switch (transaction.transactionType) {
        case 'CONTRIBUTION':
          totalContributions += Number(transaction.amount);
          if (transaction.status === 'PENDING') {
            pendingAmount += Number(transaction.amount);
          }
          if (!lastContributionDate || transaction.transactionDate > lastContributionDate) {
            lastContributionDate = transaction.transactionDate;
          }
          break;
        case 'PAYOUT':
          totalPayouts += Number(transaction.amount);
          break;
      }
    });

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
          lastContributionDate,
          totalTransactions: transactions.length
        },
        recentTransactions: transactions.slice(0, 5)
      },
      message: 'Member statistics retrieved successfully'
    };
  }

  async joinGroupWithCode(userId: string, code: string) {
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
  }
}


