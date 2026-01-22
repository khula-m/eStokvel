import { CreateTransactionInput, UpdateTransactionInput, TransactionFilters } from '../models/Transaction.model';
import { PaymentMethod } from '../utils/enums';
export declare class TransactionService {
    private generateReferenceNumber;
    createTransaction(data: CreateTransactionInput, recordedById: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        data: {
            member: {
                id: string;
                role: import(".prisma/client").$Enums.MemberRole;
                userId: string;
                stokvelGroupId: string;
                joinedAt: Date;
            };
            group: {
                name: string;
                id: string;
                currency: string;
            };
            recordedBy: {
                id: string;
                phoneNumber: string;
                fullName: string;
            };
        } & {
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
        };
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
        data?: undefined;
    }>;
    getTransactionById(id: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        data: {
            member: {
                user: {
                    id: string;
                    phoneNumber: string;
                    fullName: string;
                };
            } & {
                id: string;
                role: import(".prisma/client").$Enums.MemberRole;
                userId: string;
                stokvelGroupId: string;
                joinedAt: Date;
            };
            group: {
                name: string;
                id: string;
                currency: string;
            };
            recordedBy: {
                id: string;
                phoneNumber: string;
                fullName: string;
            };
        } & {
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
        };
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
        data?: undefined;
    }>;
    updateTransaction(id: string, data: UpdateTransactionInput, _updatedById: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        data: {
            member: {
                user: {
                    fullName: string;
                };
            } & {
                id: string;
                role: import(".prisma/client").$Enums.MemberRole;
                userId: string;
                stokvelGroupId: string;
                joinedAt: Date;
            };
            group: {
                name: string;
                id: string;
            };
        } & {
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
        };
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
        data?: undefined;
    }>;
    getTransactions(filters: TransactionFilters, page?: number, limit?: number): Promise<{
        success: boolean;
        data: {
            transactions: ({
                member: {
                    user: {
                        id: string;
                        phoneNumber: string;
                        fullName: string;
                    };
                } & {
                    id: string;
                    role: import(".prisma/client").$Enums.MemberRole;
                    userId: string;
                    stokvelGroupId: string;
                    joinedAt: Date;
                };
                group: {
                    name: string;
                    id: string;
                    currency: string;
                };
                recordedBy: {
                    id: string;
                    fullName: string;
                };
            } & {
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
            })[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                pages: number;
                hasNext: boolean;
                hasPrev: boolean;
            };
            summary: {
                totalAmount: number;
                averageAmount: number;
                count: number;
            };
        };
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
        data?: undefined;
    }>;
    getGroupTransactionStats(groupId: string, period?: 'day' | 'week' | 'month' | 'year'): Promise<{
        success: boolean;
        data: {
            summary: any;
            topContributors: ({
                memberId: string;
                amount: number;
                member: {
                    name: string;
                    phone: string;
                } | null;
            } | null)[];
            recentTransactions: ({
                member: {
                    user: {
                        fullName: string;
                    };
                } & {
                    id: string;
                    role: import(".prisma/client").$Enums.MemberRole;
                    userId: string;
                    stokvelGroupId: string;
                    joinedAt: Date;
                };
            } & {
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
            })[];
            period: string;
        };
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
        data?: undefined;
    }>;
    recordContribution(data: {
        stokvelGroupId: string;
        memberId: string;
        amount: number;
        paymentMethod: PaymentMethod;
        transactionDate?: Date;
        notes?: string;
    }, recordedById: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        data: {
            member: {
                id: string;
                role: import(".prisma/client").$Enums.MemberRole;
                userId: string;
                stokvelGroupId: string;
                joinedAt: Date;
            };
            group: {
                name: string;
                id: string;
                currency: string;
            };
            recordedBy: {
                id: string;
                phoneNumber: string;
                fullName: string;
            };
        } & {
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
        };
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
        data?: undefined;
    }>;
    recordPayout(data: {
        stokvelGroupId: string;
        memberId: string;
        amount: number;
        paymentMethod: PaymentMethod;
        transactionDate?: Date;
        notes?: string;
    }, recordedById: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        data: {
            member: {
                id: string;
                role: import(".prisma/client").$Enums.MemberRole;
                userId: string;
                stokvelGroupId: string;
                joinedAt: Date;
            };
            group: {
                name: string;
                id: string;
                currency: string;
            };
            recordedBy: {
                id: string;
                phoneNumber: string;
                fullName: string;
            };
        } & {
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
        };
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
        data?: undefined;
    }>;
    recordLoan(data: {
        stokvelGroupId: string;
        memberId: string;
        amount: number;
        interestRate?: number;
        dueDate: Date;
        notes?: string;
    }, recordedById: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        data: {
            member: {
                id: string;
                role: import(".prisma/client").$Enums.MemberRole;
                userId: string;
                stokvelGroupId: string;
                joinedAt: Date;
            };
            group: {
                name: string;
                id: string;
                currency: string;
            };
            recordedBy: {
                id: string;
                phoneNumber: string;
                fullName: string;
            };
        } & {
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
        };
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
        data?: undefined;
    }>;
    recordLoanRepayment(data: {
        transactionId: string;
        amount: number;
        paymentMethod: PaymentMethod;
        notes?: string;
    }, recordedById: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        data: {
            repayment: ({
                member: {
                    id: string;
                    role: import(".prisma/client").$Enums.MemberRole;
                    userId: string;
                    stokvelGroupId: string;
                    joinedAt: Date;
                };
                group: {
                    name: string;
                    id: string;
                    currency: string;
                };
                recordedBy: {
                    id: string;
                    phoneNumber: string;
                    fullName: string;
                };
            } & {
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
            }) | undefined;
            remainingBalance: number;
            isFullyRepaid: boolean;
        };
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
        data?: undefined;
    }>;
    getDashboardData(groupId: string, userId: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        data: {
            groupName: string;
            totalMembers: number;
            totalContributions: number;
            totalWithdrawals: number;
        };
        message?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: any;
        data?: undefined;
    }>;
}
//# sourceMappingURL=transaction.service.d.ts.map