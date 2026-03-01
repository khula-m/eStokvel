import { Prisma } from '@prisma/client';

// Input types for creating/updating
export interface CreateStokvelGroupInput {
  name: string;
  description?: string;
  contributionAmount?: number;
  contributionFrequency?: string;
  durationMonths?: number;
  currency?: string;
  meetingSchedule?: string;
}

export interface UpdateStokvelGroupInput {
  name?: string;
  description?: string;
  contributionAmount?: number;
  contributionFrequency?: string;
  currency?: string;
  meetingSchedule?: string;
  isActive?: boolean;
  payoutDate?: Date;
}

// Type for group with relations
export type StokvelGroupWithRelations = Prisma.StokvelGroupGetPayload<{
  include: {
    createdBy: {
      select: {
        id: true;
        fullName: true;
        phoneNumber: true;
      }
    };
    members: {
      include: {
        user: {
          select: {
            id: true;
            fullName: true;
            phoneNumber: true;
          }
        }
      }
    };
    _count: {
      select: {
        members: true;
        transactions: true;
      }
    }
  }
}>;

// Statistics interface
export interface StokvelGroupStats {
  totalMembers: number;
  totalBalance: number;
  monthlyContributionTarget: number;
  contributionsThisMonth: number;
  pendingTransactions: number;
  nextPayoutDate?: Date;
}
