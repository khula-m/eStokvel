// ── Shared types used across all microservices ──

// ── User types ──
export interface CreateUserInput {
  phoneNumber: string;
  email?: string;
  fullName: string;
  pin: string;
  role?: string;
}

export interface LoginInput {
  phoneNumber: string;
  pin: string;
}

export interface UserInfo {
  id: string;
  phoneNumber: string;
  email?: string | null;
  fullName: string;
  role: string;
  language: string;
  createdAt: Date;
  lastLogin?: Date | null;
}

// ── Group types ──
export interface CreateStokvelGroupInput {
  name: string;
  description?: string;
  contributionAmount?: number;
  contributionFrequency?: string;
  payoutModel?: 'ROTATING' | 'END_OF_TERM';
  durationMonths?: number;
  currency?: string;
  meetingSchedule?: string;
}

export interface UpdateStokvelGroupInput {
  name?: string;
  description?: string;
  contributionAmount?: number;
  contributionFrequency?: string;
  payoutModel?: 'ROTATING' | 'END_OF_TERM';
  currency?: string;
  meetingSchedule?: string;
  isActive?: boolean;
  payoutDate?: Date;
}

export interface StokvelGroupStats {
  totalMembers: number;
  totalBalance: number;
  monthlyContributionTarget: number;
  contributionsThisMonth: number;
  pendingTransactions: number;
  nextPayoutDate?: Date;
}

// ── Member types ──
export interface CreateMemberInput {
  userId: string;
  stokvelGroupId: string;
  role?: string;
}

export interface UpdateMemberInput {
  role?: string;
}

export interface MemberStats {
  totalContributions: number;
  totalPayouts: number;
  currentBalance: number;
  pendingAmount: number;
  lastTransactionDate?: Date;
  nextContributionDue?: Date;
}

// ── Transaction types ──
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

// ── Service response wrapper ──
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: any;
}

// ── JWT payload ──
export interface JwtPayload {
  userId: string;
  phoneNumber: string;
  role: string;
}
