"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StokvelGroupService = void 0;
const client_1 = require("@prisma/client");
const enums_1 = require("../utils/enums");
const prisma = new client_1.PrismaClient();
class StokvelGroupService {
    async generateUniqueCode() {
        const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        let isUnique = false;
        while (!isUnique) {
            for (let i = 0; i < 6; i++) {
                code += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            const existing = await prisma.stokvelGroup.findUnique({
                where: { code }
            });
            if (!existing) {
                isUnique = true;
            }
            else {
                code = '';
            }
        }
        return code;
    }
    async createGroup(data, createdById) {
        try {
            const code = await this.generateUniqueCode();
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
            await prisma.member.create({
                data: {
                    userId: createdById,
                    stokvelGroupId: group.id,
                    role: enums_1.MemberRole.CHAIRPERSON,
                }
            });
            return {
                success: true,
                data: group,
                message: 'Stokvel group created successfully'
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to create group',
                error: error
            };
        }
    }
    async getGroupById(id, userId) {
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
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to retrieve group',
                error: error
            };
        }
    }
    async getGroupByCode(code) {
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
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to retrieve group',
                error: error
            };
        }
    }
    async updateGroup(id, data) {
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
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to update group',
                error: error
            };
        }
    }
    async getUserGroups(userId) {
        try {
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
            const groups = [
                ...createdGroups.map(group => ({
                    ...group,
                    userRole: enums_1.MemberRole.CHAIRPERSON,
                    isCreator: true
                })),
                ...memberGroups.map(member => ({
                    ...member.group,
                    userRole: member.role,
                    isCreator: false
                }))
            ];
            const uniqueGroups = Array.from(new Map(groups.map(group => [group.id, group])).values());
            return {
                success: true,
                data: uniqueGroups,
                message: 'User groups retrieved successfully'
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to retrieve user groups',
                error: error
            };
        }
    }
    async deleteGroup(id, userId) {
        try {
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
            const updatedGroup = await prisma.stokvelGroup.update({
                where: { id },
                data: {
                    isActive: false,
                }
            });
            return {
                success: true,
                data: updatedGroup,
                message: 'Group deactivated successfully'
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to delete group',
                error: error
            };
        }
    }
    async getGroupStats(groupId) {
        try {
            const memberCount = await prisma.member.count({
                where: { stokvelGroupId: groupId }
            });
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
            let totalContributions = 0;
            let totalPayouts = 0;
            transactions.forEach(transaction => {
                if (transaction.transactionType === 'CONTRIBUTION') {
                    totalContributions += transaction.amount;
                }
                else if (transaction.transactionType === 'PAYOUT') {
                    totalPayouts += transaction.amount;
                }
            });
            const totalBalance = totalContributions - totalPayouts;
            const pendingCount = await prisma.transaction.count({
                where: {
                    stokvelGroupId: groupId,
                    status: 'PENDING'
                }
            });
            const group = await prisma.stokvelGroup.findUnique({
                where: { id: groupId },
                select: {
                    contributionAmount: true,
                    contributionFrequency: true
                }
            });
            const monthlyTarget = group?.contributionAmount || 0;
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
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to retrieve group statistics',
                error: error
            };
        }
    }
    async joinGroup(groupId, userId) {
        try {
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
            const member = await prisma.member.create({
                data: {
                    userId,
                    stokvelGroupId: groupId,
                    role: enums_1.MemberRole.MEMBER
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
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to join group',
                error: error
            };
        }
    }
    async getGroupMembers(groupId) {
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
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to retrieve group members',
                error: error
            };
        }
    }
}
exports.StokvelGroupService = StokvelGroupService;
//# sourceMappingURL=stokvelGroup.service.js.map