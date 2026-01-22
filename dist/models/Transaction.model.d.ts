import { Prisma } from '@prisma/client';
export interface CreateTransactionInput {
    stokvelGroupId: string;
    memberId: string;
    transactionType: string;
    amount: number;
    paymentMethod: string;
    transactionDate?: Date;
    referenceNumber?: string;
    notes?: string;
    metadata?: any;
}
export interface UpdateTransactionInput {
    status?: string;
    notes?: string;
    metadata?: any;
    receiptUrl?: string;
}
export type TransactionWithDetails = Prisma.TransactionGetPayload<{
    include: {
        group: {
            select: {
                id: true;
                name: true;
                currency: true;
            };
        };
        member: {
            include: {
                user: {
                    select: {
                        id: true;
                        fullName: true;
                        phoneNumber: true;
                    };
                };
            };
        };
        recordedBy: {
            select: {
                id: true;
                fullName: true;
                phoneNumber: true;
            };
        };
    };
}>;
export interface TransactionFilters {
    stokvelGroupId?: string;
    memberId?: string;
    transactionType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    paymentMethod?: string;
    minAmount?: number;
    maxAmount?: number;
}
//# sourceMappingURL=Transaction.model.d.ts.map