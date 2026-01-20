import { CreateMemberInput, UpdateMemberInput } from '../models/Member.model';
export declare class MemberService {
    addMember(data: CreateMemberInput, invitedById?: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            user: {
                id: string;
                phoneNumber: string;
                email: string | null;
                fullName: string;
            };
            group: {
                name: string;
                id: string;
                code: string;
            };
        } & {
            id: string;
            role: import(".prisma/client").$Enums.MemberRole;
            userId: string;
            stokvelGroupId: string;
            joinedAt: Date;
        };
        message: string;
    }>;
    getMemberById(id: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            transactions: {
                id: string;
                transactionType: import(".prisma/client").$Enums.TransactionType;
                amount: number;
                transactionDate: Date;
                status: import(".prisma/client").$Enums.TransactionStatus;
            }[];
            user: {
                id: string;
                phoneNumber: string;
                email: string | null;
                fullName: string;
                createdAt: Date;
            };
            group: {
                name: string;
                id: string;
                code: string;
                contributionAmount: number;
                currency: string;
            };
        } & {
            id: string;
            role: import(".prisma/client").$Enums.MemberRole;
            userId: string;
            stokvelGroupId: string;
            joinedAt: Date;
        };
        message: string;
    }>;
    updateMember(id: string, data: UpdateMemberInput): Promise<{
        success: boolean;
        data: {
            user: {
                id: string;
                phoneNumber: string;
                fullName: string;
            };
            group: {
                name: string;
                id: string;
            };
        } & {
            id: string;
            role: import(".prisma/client").$Enums.MemberRole;
            userId: string;
            stokvelGroupId: string;
            joinedAt: Date;
        };
        message: string;
    }>;
    removeMember(id: string, removedById: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getGroupMembers(groupId: string, filters?: {
        role?: string;
        search?: string;
    }): Promise<{
        success: boolean;
        data: {
            stats: {
                totalContributions: number;
                totalPayouts: number;
                balance: number;
            };
            user: {
                id: string;
                phoneNumber: string;
                email: string | null;
                fullName: string;
            };
            _count: {
                transactions: number;
            };
            id: string;
            role: import(".prisma/client").$Enums.MemberRole;
            userId: string;
            stokvelGroupId: string;
            joinedAt: Date;
        }[];
        message: string;
    }>;
    getMemberStats(memberId: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            member: {
                id: string;
                name: string;
                role: import(".prisma/client").$Enums.MemberRole;
                joinedAt: Date;
            };
            group: {
                name: string;
                contributionAmount: number;
                contributionFrequency: string;
            };
            stats: {
                totalContributions: number;
                totalPayouts: number;
                currentBalance: number;
                totalLoans: number;
                totalRepayments: number;
                outstandingLoan: number;
                pendingAmount: number;
                lastContributionDate: null;
                totalTransactions: number;
            };
            recentTransactions: {
                id: string;
                stokvelGroupId: string;
                currency: string;
                memberId: string;
                transactionType: import(".prisma/client").$Enums.TransactionType;
                amount: number;
                referenceNumber: string | null;
                paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
                transactionDate: Date;
                recordDate: Date;
                recordedById: string;
                status: import(".prisma/client").$Enums.TransactionStatus;
                notes: string | null;
                metadata: import("@prisma/client/runtime/library").JsonValue | null;
                receiptUrl: string | null;
            }[];
        };
        message: string;
    }>;
    joinGroupWithCode(userId: string, code: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            user: {
                id: string;
                phoneNumber: string;
                email: string | null;
                fullName: string;
            };
            group: {
                name: string;
                id: string;
                code: string;
            };
        } & {
            id: string;
            role: import(".prisma/client").$Enums.MemberRole;
            userId: string;
            stokvelGroupId: string;
            joinedAt: Date;
        };
        message: string;
    }>;
}
//# sourceMappingURL=member.service.d.ts.map