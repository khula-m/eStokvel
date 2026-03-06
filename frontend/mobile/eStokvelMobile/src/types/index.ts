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
  phoneNumber: string;
  email?: string;
  role: string; // Global role: 'SUPERADMIN' | 'MEMBER'
  effectiveRole?: string; // Derived: 'ADMIN' if admin of any group, else 'MEMBER'
  mustChangePin?: boolean;
  memberships?: UserMembership[]; // Per-group roles
  managedGroups?: any[]; // Backward compat: groups where user is admin
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  contributionAmount: number;
  contributionFrequency: string;
  durationMonths?: number;
  startDate?: string;
  endDate?: string;
  memberCount?: number;
  _count?: { members: number; transactions: number };
  totalBalance?: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  stokvelGroupId: string;
  transactionType: string;
  amount: number | string;
  status: string;
  description?: string;
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
