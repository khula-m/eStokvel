export declare enum UserRole {
    MEMBER = "MEMBER",
    TREASURER = "TREASURER",
    SECRETARY = "SECRETARY",
    CHAIRPERSON = "CHAIRPERSON",
    ADMIN = "ADMIN"
}
export declare enum MemberRole {
    TREASURER = "TREASURER",
    SECRETARY = "SECRETARY",
    CHAIRPERSON = "CHAIRPERSON",
    MEMBER = "MEMBER"
}
export declare enum TransactionType {
    CONTRIBUTION = "CONTRIBUTION",
    PAYOUT = "PAYOUT",
    FINE_PAYMENT = "FINE_PAYMENT",
    LOAN_DISBURSEMENT = "LOAN_DISBURSEMENT",
    LOAN_REPAYMENT = "LOAN_REPAYMENT",
    INTEREST = "INTEREST",
    EXPENSE = "EXPENSE",
    ADJUSTMENT = "ADJUSTMENT"
}
export declare enum PaymentMethod {
    CASH = "CASH",
    BANK_TRANSFER = "BANK_TRANSFER",
    MOBILE_MONEY = "MOBILE_MONEY",
    CARD = "CARD",
    VOUCHER = "VOUCHER"
}
export declare enum TransactionStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    REVERSED = "REVERSED",
    CANCELLED = "CANCELLED"
}
export declare const getTransactionTypeLabel: (type: TransactionType) => string;
export declare const getMemberRoleLabel: (role: MemberRole) => string;
export declare enum MemberStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    SUSPENDED = "SUSPENDED"
}
//# sourceMappingURL=enums.d.ts.map