// ── Enums matching the Prisma schema ──

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  MEMBER = 'MEMBER',
}

export enum MemberRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum TransactionType {
  CONTRIBUTION = 'CONTRIBUTION',
  PAYOUT = 'PAYOUT',
  EXPENSE = 'EXPENSE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CARD = 'CARD',
  EFT = 'EFT',
  OZOW = 'OZOW',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
  CANCELLED = 'CANCELLED',
}

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

// ── Label helpers ──

export const getTransactionTypeLabel = (type: TransactionType): string => {
  const labels: Record<TransactionType, string> = {
    [TransactionType.CONTRIBUTION]: 'Contribution',
    [TransactionType.PAYOUT]: 'Payout',
    [TransactionType.EXPENSE]: 'Expense',
    [TransactionType.ADJUSTMENT]: 'Adjustment',
  };
  return labels[type] || type;
};

export const getMemberRoleLabel = (role: MemberRole): string => {
  const labels: Record<MemberRole, string> = {
    [MemberRole.ADMIN]: 'Admin',
    [MemberRole.MEMBER]: 'Member',
  };
  return labels[role] || role;
};

export const getUserRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    [UserRole.SUPERADMIN]: 'Super Admin',
    [UserRole.MEMBER]: 'Member',
  };
  return labels[role] || role;
};
