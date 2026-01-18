import { PrismaClient } from '@prisma/client';
import { CreateStokvelGroupInput, UpdateStokvelGroupInput } from '../models/StokvelGroup.model';
import { MemberRole } from '../utils/enums';

const prisma = new PrismaClient();

export class StokvelGroupService {
  /**
   * Generate a unique group code
   */
  private async generateUniqueCode(): Promise<string> {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters
    let code = '';
    let isUnique = false;
    
    while (!isUnique) {
      // Generate 6-character code
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Check if code already exists
      const existing = await prisma.stokvelGroup.findUnique({
        where: { code }
      });
      
      if (!existing) {
        isUnique = true;
      } else {
        code = ''; // Reset and try again
      }
    }
    
    return code;
  }

  /**
   * Create a new Stokvel group
   */
  async createGroup(data: CreateStokvelGroupInput, createdById: string) {
    try {
      // Generate unique group code
      const code = await this.generateUniqueCode();
      
      // Create the group
      const group = await prisma.stokvelGroup.create({
        data: {
          ...data,
          code,
          createdById,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
            }
          }
        }
      });

      // Automatically add creator as CHAIRPERSON
      await prisma.member.create({
        data: {
          userId: createdById,
          stokvelGroupId: group.id,
          role: MemberRole.CHAIRPERSON,
        }
      });

      return {
        success: true,
        data: group,
        message: 'Stokvel group created successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create group',
        error: error
      };
    }
  }

  /**
   * Get group by ID with details
   */
  async getGroupById(id: string, userId?: string) {
    try {
      const group = await prisma.stokvelGroup.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phoneNumber: true,
                  email: true,
                }
              }
            }
          },
          _count: {
            select: {
              members: true,
              transactions: true,
            }
          }
        }
      });

      if (!group) {
        return {
          success: false,
          message: 'Group not found'
        };
      }

      // Check if user is a member (if userId provided)
      let isMember = false;
      if (userId) {
        const membership = await prisma.member.findUnique({
          where: {
            userId_stokvelGroupId: {
              userId,
              stokvelGroupId: id
            }
          }
        });
        isMember = !!membership;
      }

      return {
        success: true,
        data: {
          ...group,
          isMember
        },
        message: 'Group retrieved successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve group',
        error: error
      };
    }
  }

  /**
   * Get group by invite code
   */
  async getGroupByCode(code: string) {
    try {
      const group = await prisma.stokvelGroup.findUnique({
        where: { code },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
            }
          },
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
          message: 'Group not found'
        };
      }

      return {
        success: true,
        data: group,
        message: 'Group retrieved successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve group',
        error: error
      };
    }
  }

  /**
   * Update group details
   */
  async updateGroup(id: string, data: UpdateStokvelGroupInput) {
    try {
      const group = await prisma.stokvelGroup.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
            }
          }
        }
      });

      return {
        success: true,
        data: group,
        message: 'Group updated successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update group',
        error: error
      };
    }
  }

  /**
   * Get all groups for a user (created by or member of)
   */
  async getUserGroups(userId: string) {
    try {
      // Get groups where user is a member
      const memberGroups = await prisma.member.findMany({
        where: { userId },
        include: {
          group: {
            include: {
              createdBy: {
                select: {
                  id: true,
                  fullName: true,
                  phoneNumber: true,
                }
              },
              _count: {
                select: {
                  members: true,
                  transactions: true,
                }
              }
            }
          }
        }
      });

      // Get groups created by user
      const createdGroups = await prisma.stokvelGroup.findMany({
        where: { createdById: userId },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
            }
          },
          _count: {
            select: {
              members: true,
              transactions: true,
            }
          }
        }
      });

      // Combine and format
      const groups = [
        ...createdGroups.map(group => ({
          ...group,
          userRole: MemberRole.CHAIRPERSON,
          isCreator: true
        })),
        ...memberGroups.map(member => ({
          ...member.group,
          userRole: member.role,
          isCreator: false
        }))
      ];

      // Remove duplicates (if user is both creator and member)
      const uniqueGroups = Array.from(
        new Map(groups.map(group => [group.id, group])).values()
      );

      return {
        success: true,
        data: uniqueGroups,
        message: 'User groups retrieved successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve user groups',
        error: error
      };
    }
  }

  /**
   * Delete a group (soft delete by marking as inactive)
   */
  async deleteGroup(id: string, userId: string) {
    try {
      // Verify user is the creator
      const group = await prisma.stokvelGroup.findUnique({
        where: { id }
      });

      if (!group) {
        return {
          success: false,
          message: 'Group not found'
        };
      }

      if (group.createdById !== userId) {
        return {
          success: false,
          message: 'Only the group creator can delete the group'
        };
      }

      // Soft delete by marking as inactive
      const updatedGroup = await prisma.stokvelGroup.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        data: updatedGroup,
        message: 'Group deactivated successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete group',
        error: error
      };
    }
  }

  /**
   * Get group statistics
   */
  async getGroupStats(groupId: string) {
    try {
      // Get total members
      const memberCount = await prisma.member.count({
        where: { stokvelGroupId: groupId }
      });

      // Get total transactions amount
      const transactions = await prisma.transaction.findMany({
        where: { 
          stokvelGroupId: groupId,
          status: 'COMPLETED'
        },
        select: {
          amount: true,
          transactionType: true
        }
      });

      // Calculate totals
      let totalContributions = 0;
      let totalPayouts = 0;
      
      transactions.forEach(transaction => {
        if (transaction.transactionType === 'CONTRIBUTION') {
          totalContributions += transaction.amount;
        } else if (transaction.transactionType === 'PAYOUT') {
          totalPayouts += transaction.amount;
        }
      });

      const totalBalance = totalContributions - totalPayouts;

      // Get pending transactions count
      const pendingCount = await prisma.transaction.count({
        where: { 
          stokvelGroupId: groupId,
          status: 'PENDING'
        }
      });

      // Get monthly contribution target
      const group = await prisma.stokvelGroup.findUnique({
        where: { id: groupId },
        select: {
          contributionAmount: true,
          contributionFrequency: true
        }
      });

      const monthlyTarget = group?.contributionAmount || 0;
      
      // Calculate this month's contributions
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const thisMonthContributions = await prisma.transaction.aggregate({
        where: {
          stokvelGroupId: groupId,
          transactionType: 'CONTRIBUTION',
          status: 'COMPLETED',
          transactionDate: {
            gte: startOfMonth
          }
        },
        _sum: {
          amount: true
        }
      });

      const collectedThisMonth = thisMonthContributions._sum.amount || 0;

      return {
        success: true,
        data: {
          totalMembers: memberCount,
          totalBalance,
          monthlyTarget,
          collectedThisMonth,
          pendingTransactions: pendingCount,
          totalContributions,
          totalPayouts
        },
        message: 'Group statistics retrieved successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve group statistics',
        error: error
      };
    }
  }
}
