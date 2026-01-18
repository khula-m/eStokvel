// These enums match the Prisma schema
export enum UserRole {
  MEMBER = 'MEMBER',
  TREASURER = 'TREASURER',
  SECRETARY = 'SECRETARY',
  CHAIRPERSON = 'CHAIRPERSON',
  ADMIN = 'ADMIN'
}

export enum MemberRole {
  TREASURER = 'TREASURER',
  SECRETARY = 'SECRETARY',
  CHAIRPERSON = 'CHAIRPERSON',
  MEMBER = 'MEMBER'
}

export enum TransactionType {
  CONTRIBUTION = 'CONTRIBUTION',
  PAYOUT = 'PAYOUT',
  FINE_PAYMENT = 'FINE_PAYMENT',
  LOAN_DISBURSEMENT = 'LOAN_DISBURSEMENT',
  LOAN_REPAYMENT = 'LOAN_REPAYMENT',
  INTEREST = 'INTEREST',
  EXPENSE = 'EXPENSE',
  ADJUSTMENT = 'ADJUSTMENT'
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CARD = 'CARD',
  VOUCHER = 'VOUCHER'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
  CANCELLED = 'CANCELLED'
}

// Helper functions
export const getTransactionTypeLabel = (type: TransactionType): string => {
  const labels: Record<TransactionType, string> = {
    [TransactionType.CONTRIBUTION]: 'Contribution',
    [TransactionType.PAYOUT]: 'Payout',
    [TransactionType.FINE_PAYMENT]: 'Fine Payment',
    [TransactionType.LOAN_DISBURSEMENT]: 'Loan Disbursement',
    [TransactionType.LOAN_REPAYMENT]: 'Loan Repayment',
    [TransactionType.INTEREST]: 'Interest',
    [TransactionType.EXPENSE]: 'Expense',
    [TransactionType.ADJUSTMENT]: 'Adjustment'
  };
  return labels[type] || type;
};

export const getMemberRoleLabel = (role: MemberRole): string => {
  const labels: Record<MemberRole, string> = {
    [MemberRole.TREASURER]: 'Treasurer',
    [MemberRole.SECRETARY]: 'Secretary',
    [MemberRole.CHAIRPERSON]: 'Chairperson',
    [MemberRole.MEMBER]: 'Member'
  };
  return labels[role] || role;
};


export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

