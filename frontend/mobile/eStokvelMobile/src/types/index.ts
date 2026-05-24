export interface UserMembership {
  id: string;
  role: 'ADMIN' | 'MEMBER';
  groupId: string;
  groupName: string;
  groupCode: string;
  groupActive: boolean;
  memberCount: number;
}

export interface User {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
  // System-wide role only. 'SUPERADMIN' (web portal admin) or 'MEMBER'.
  // Group-admin status is NOT stored here — read it from `memberships[].role`
  // for the specific group you are acting on.
  role: 'SUPERADMIN' | 'MEMBER' | string;
  mustChangePin?: boolean;
  needsIdVerification?: boolean;
  verificationStatus?: string;
  memberships?: UserMembership[]; // Per-group roles — the source of truth for ADMIN status
  managedGroups?: any[]; // Backward compat: groups where user is admin
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  contributionAmount: number;
  contributionFrequency: string;
  payoutModel?: 'ROTATING' | 'END_OF_TERM';
  durationMonths?: number;
  startDate?: string;
  endDate?: string;
  memberCount?: number;
  _count?: { members: number; transactions: number };
  totalBalance?: number;
  createdAt: string;
}

export type TransactionTypeName = 'CONTRIBUTION' | 'PAYOUT' | 'EXPENSE' | 'ADJUSTMENT';
export type TransactionSourceName =
  | 'MEMBER_PAYMENT'
  | 'GATEWAY_WEBHOOK'
  | 'ADMIN_MANUAL_RECORD'
  | 'SUPERADMIN_ADJUSTMENT'
  | 'SYSTEM';

export interface Transaction {
  id: string;
  stokvelGroupId: string;
  transactionType: TransactionTypeName | string;
  // Origin of this row. Optional because old API responses may not include it
  // and the field only lands after the source migration is applied.
  source?: TransactionSourceName;
  amount: number | string;
  status: string;
  description?: string;
  notes?: string;
  transactionDate: string;
  paymentMethod?: string;
  referenceNumber?: string;
  member?: { user: { fullName: string } };
  group?: { id: string; name: string };
}

export interface Member {
  id: string;
  userId: string;
  groupId: string;
  role: string;
  joinedAt: string;
  user: { fullName: string; phoneNumber: string };
  group?: { name: string };
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  createdByUser?: { fullName: string };
  isRead?: boolean;
  readCount?: number;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  createdAt: string;
  createdByUser?: { fullName: string };
  goingCount?: number;
  maybeCount?: number;
  myStatus?: string | null;
  attendees?: { name: string; status: string }[];
}

export interface ChatMsg {
  id: string;
  message: string;
  content?: string;
  createdAt: string;
  sender: { id: string; fullName: string };
  pinned?: boolean;
}

export interface GroupMember {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; fullName: string; phoneNumber: string };
  paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE';
  lastContributionDate: string | null;
  lastContributionAmount: number | null;
  daysSincePayment: number | null;
}

export interface AppNotification {
  id: string;
  type: string;
  message: string;
  status: string;
  date: string;
}

export interface PendingPayment {
  id: string;
  amount: number | string;
  status: string;
  transactionType: string;
  paymentMethod?: string;
  referenceNumber?: string;
  transactionDate: string;
  recordDate: string;
  proofUrl?: string;
  member: {
    id: string;
    user: { id: string; fullName: string; phoneNumber: string };
  };
  group: { id: string; name: string };
}

export interface AuthState {
  user: User | null;
  token: string | null;
}
