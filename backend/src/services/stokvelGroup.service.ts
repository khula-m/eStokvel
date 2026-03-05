
import { CreateStokvelGroupInput, UpdateStokvelGroupInput } from '../models/StokvelGroup.model';

import { MemberRole } from '../utils/enums';

import { prisma } from '../utils/prisma';



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

      

      // Calculate endDate from durationMonths

      const startDate = new Date();

      const durationMonths = data.durationMonths || 12;

      const endDate = new Date(startDate);

      endDate.setMonth(endDate.getMonth() + durationMonths);



      // Create the group

      const group = await prisma.stokvelGroup.create({

        data: {

          ...data,

          code,

          createdById,

          startDate,

          endDate,

          durationMonths,

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



      // Automatically add creator as ADMIN of the group

      await prisma.member.create({

        data: {

          userId: createdById,

          stokvelGroupId: group.id,

          role: MemberRole.ADMIN,

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

      // Get all groups where user is a member (includes groups they admin)

      const memberGroups = await prisma.member.findMany({

        where: { userId, group: { isActive: true } },

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



      // Format — userRole comes from Member.role (per-group)

      const groups = memberGroups.map((member: any) => ({

        ...member.group,

        userRole: member.role, // 'ADMIN' or 'MEMBER' for this specific group

        isCreator: member.group.createdById === userId,

      }));



      return {

        success: true,

        data: groups,

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

  async deleteGroup(id: string, userId: string, userRole?: string) {

    try {

      const group = await prisma.stokvelGroup.findUnique({

        where: { id },

        include: {

          members: {

            select: { id: true, userId: true, role: true }

          }

        }

      });



      if (!group) {

        return {

          success: false,

          message: 'Group not found'

        };

      }



      // SUPERADMIN can always delete any group

      if (userRole === 'SUPERADMIN') {

        await prisma.stokvelGroup.update({

          where: { id },

          data: { isActive: false }

        });

        return {

          success: true,

          message: 'Group deactivated successfully by superadmin'

        };

      }



      // ADMIN: must be a group admin (via Member.role)

      const isGroupAdmin = group.members.some(

        (m: any) => m.userId === userId && m.role === 'ADMIN'

      );

      if (!isGroupAdmin) {

        return {

          success: false,

          message: 'You are not authorized to delete this group'

        };

      }



      // ADMIN: count non-admin members

      const nonAdminMembers = group.members.filter(

        (m: any) => m.userId !== userId && m.role !== 'ADMIN'

      );



      if (nonAdminMembers.length > 0) {

        return {

          success: false,

          message: `Cannot delete group with ${nonAdminMembers.length} active member(s). Only a superadmin can delete groups that have members.`

        };

      }



      // Group is empty (only admin) — admin can delete

      await prisma.stokvelGroup.update({

        where: { id },

        data: { isActive: false }

      });



      return {

        success: true,

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

      

      transactions.forEach((transaction: any) => {

        if (transaction.transactionType === 'CONTRIBUTION') {

          totalContributions += Number(transaction.amount);

        } else if (transaction.transactionType === 'PAYOUT') {

          totalPayouts += Number(transaction.amount);

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



      const monthlyTarget = Number(group?.contributionAmount || 0);

      

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



      const collectedThisMonth = Number(thisMonthContributions._sum.amount || 0);



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



  /**

  * Join a stokvel group

  */

  async joinGroup(groupId: string, userId: string) {

    try {

      // Check if group exists

      const group = await prisma.stokvelGroup.findUnique({

        where: { id: groupId }

      });



      if (!group) {

        return {

          success: false,

          message: 'Group not found'

        };

      }



      if (!group.isActive) {

        return {

          success: false,

          message: 'Group is not active'

        };

      }



      // Check if user is already a member

      const existingMember = await prisma.member.findUnique({

        where: {

          userId_stokvelGroupId: {

            userId,

            stokvelGroupId: groupId

          }

        }

      });



      if (existingMember) {

        return {

          success: false,

          message: 'User is already a member of this group'

        };

      }



      // Add user as member

      const member = await prisma.member.create({

        data: {

          userId,

          stokvelGroupId: groupId,

          role: MemberRole.MEMBER

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

              name: true,

              code: true

            }

          }

        }

      });



      return {

        success: true,

        data: member,

        message: 'Successfully joined group'

      };

      

    } catch (error: any) {

      return {

        success: false,

        message: error.message || 'Failed to join group',

        error: error

      };

    }

  }



  /**

  * Get all members of a group

  */

  async getGroupMembers(groupId: string) {

    try {

      const members = await prisma.member.findMany({

        where: { stokvelGroupId: groupId },

        include: {

          user: {

            select: {

              id: true,

              fullName: true,

              phoneNumber: true,

              email: true

            }

          }

        },

        orderBy: {

          joinedAt: 'desc'

        }

      });



      return {

        success: true,

        data: members,

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

}





