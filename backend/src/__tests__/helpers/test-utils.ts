/**
 * Test helper utilities - JWT generation, test data factories, etc.
 */
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-jest';

// ============ JWT Helpers ============

export function generateTestToken(overrides: Partial<{
  userId: string;
  phoneNumber: string;
  role: string;
  expiresIn: string;
}> = {}): string {
  const payload = {
    userId: overrides.userId || 'test-user-id',
    phoneNumber: overrides.phoneNumber || '0831234567',
    role: overrides.role || 'MEMBER',
  };
  return jwt.sign(payload, JWT_SECRET as jwt.Secret, {
    expiresIn: (overrides.expiresIn || '1h') as jwt.SignOptions["expiresIn"],
  });
}

export function generateExpiredToken(): string {
  const payload = { userId: 'test-user-id', phoneNumber: '0831234567', role: 'MEMBER' };
  return jwt.sign(payload, JWT_SECRET as jwt.Secret, { expiresIn: '0s' as jwt.SignOptions["expiresIn"] });
}

// ============ Test Data Factories ============

export const testUsers = {
  superadmin: {
    id: 'superadmin-id-001',
    phoneNumber: '0800000001',
    fullName: 'Super Admin',
    email: 'admin@estokvel.co.za',
    role: 'SUPERADMIN' as const,
    pin: null,
    password: '$2a$10$hashedpassword', // bcrypt hash
    mustChangePin: false,
    isVerified: true,
    failedAttempts: 0,
    lockedUntil: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    lastLogin: null,
    lastLoginIp: null,
    createdById: null,
    idNumber: null,
    language: 'en',
  },
  admin: {
    id: 'admin-user-id-001',
    phoneNumber: '0831234567',
    fullName: 'Test Admin',
    email: null,
    role: 'MEMBER' as const, // Global role is MEMBER; admin is per-group
    pin: '$2a$10$hashedpin56789', // bcrypt hash of '56789'
    password: null,
    mustChangePin: false,
    isVerified: true,
    failedAttempts: 0,
    lockedUntil: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    lastLogin: null,
    lastLoginIp: null,
    createdById: 'superadmin-id-001',
    idNumber: null,
    language: 'en',
  },
  member: {
    id: 'member-user-id-001',
    phoneNumber: '0831234568',
    fullName: 'Test Member',
    email: null,
    role: 'MEMBER' as const,
    pin: '$2a$10$hashedpinmember', // bcrypt hash
    password: null,
    mustChangePin: true,
    isVerified: true,
    failedAttempts: 0,
    lockedUntil: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    lastLogin: null,
    lastLoginIp: null,
    createdById: 'admin-user-id-001',
    idNumber: null,
    language: 'en',
  },
};

export const testGroups = {
  active: {
    id: 'group-id-001',
    name: 'Masiphumulele Savings',
    code: 'MDIC2024',
    description: 'Monthly savings group',
    contributionAmount: { toNumber: () => 500 } as any,
    contributionFrequency: 'MONTHLY',
    durationMonths: 12,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2026-01-01'),
    payoutDate: null,
    currency: 'ZAR',
    meetingSchedule: null,
    isActive: true,
    createdById: 'admin-user-id-001',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    bankName: null,
    accountNumber: null,
    accountHolder: null,
    branchCode: null,
  },
  inactive: {
    id: 'group-id-002',
    name: 'Closed Group',
    code: 'CLOSED1',
    description: 'Completed group',
    contributionAmount: { toNumber: () => 1000 } as any,
    contributionFrequency: 'MONTHLY',
    durationMonths: 12,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-01-01'),
    payoutDate: null,
    currency: 'ZAR',
    meetingSchedule: null,
    isActive: false,
    createdById: 'admin-user-id-001',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2025-01-01'),
    bankName: null,
    accountNumber: null,
    accountHolder: null,
    branchCode: null,
  },
};

export const testMembers = {
  adminMember: {
    id: 'member-id-admin',
    userId: 'admin-user-id-001',
    stokvelGroupId: 'group-id-001',
    role: 'ADMIN' as const,
    joinedAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    payoutBankName: null,
    payoutAccountNumber: null,
    payoutAccountHolder: null,
    payoutBranchCode: null,
    nextPayoutOrder: 1,
  },
  regularMember: {
    id: 'member-id-regular',
    userId: 'member-user-id-001',
    stokvelGroupId: 'group-id-001',
    role: 'MEMBER' as const,
    joinedAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    payoutBankName: null,
    payoutAccountNumber: null,
    payoutAccountHolder: null,
    payoutBranchCode: null,
    nextPayoutOrder: 2,
  },
};

export const testTransactions = {
  contribution: {
    id: 'txn-id-001',
    stokvelGroupId: 'group-id-001',
    memberId: 'member-id-regular',
    transactionType: 'CONTRIBUTION' as const,
    amount: { toNumber: () => 500 } as any,
    currency: 'ZAR',
    referenceNumber: 'STK-ABC123',
    paymentMethod: 'BANK_TRANSFER' as const,
    transactionDate: new Date('2025-02-01'),
    recordDate: new Date('2025-02-01'),
    updatedAt: new Date('2025-02-01'),
    recordedById: 'admin-user-id-001',
    status: 'COMPLETED' as const,
    notes: 'Monthly contribution',
    metadata: null,
    receiptUrl: null,
    ozowTransactionId: null,
    ozowPaymentStatus: null,
    paidAt: null,
  },
  payout: {
    id: 'txn-id-002',
    stokvelGroupId: 'group-id-001',
    memberId: 'member-id-admin',
    transactionType: 'PAYOUT' as const,
    amount: { toNumber: () => 2500 } as any,
    currency: 'ZAR',
    referenceNumber: 'STK-DEF456',
    paymentMethod: 'BANK_TRANSFER' as const,
    transactionDate: new Date('2025-03-01'),
    recordDate: new Date('2025-03-01'),
    updatedAt: new Date('2025-03-01'),
    recordedById: 'admin-user-id-001',
    status: 'COMPLETED' as const,
    notes: 'Payout round 1',
    metadata: null,
    receiptUrl: null,
    ozowTransactionId: null,
    ozowPaymentStatus: null,
    paidAt: null,
  },
};
