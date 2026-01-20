import { Prisma } from '@prisma/client';
export interface CreateMemberInput {
    userId: string;
    stokvelGroupId: string;
    role?: string;
}
export interface UpdateMemberInput {
    role?: string;
}
export type MemberWithDetails = Prisma.MemberGetPayload<{
    include: {
        user: {
            select: {
                id: true;
                fullName: true;
                phoneNumber: true;
                email: true;
            };
        };
        group: {
            select: {
                id: true;
                name: true;
                currency: true;
                contributionAmount: true;
            };
        };
        transactions: {
            take: 5;
            orderBy: {
                transactionDate: 'desc';
            };
        };
    };
}>;
export interface MemberStats {
    totalContributions: number;
    totalPayouts: number;
    currentBalance: number;
    pendingAmount: number;
    lastTransactionDate?: Date;
    nextContributionDue?: Date;
}
//# sourceMappingURL=Member.model.d.ts.map