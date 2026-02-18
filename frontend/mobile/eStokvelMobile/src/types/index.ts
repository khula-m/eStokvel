// User types matching backend
export interface User {
  id: string;
  phoneNumber: string;
  email?: string;
  idNumber?: string;
  fullName: string;
  role: UserRole;
  language: 'en' | 'zu' | 'xh' | 'af' | 'st';
  createdAt: string;
  lastLogin?: string;
}

export type UserRole = 'MEMBER' | 'TREASURER' | 'CHAIRPERSON' | 'SECRETARY' | 'ADMIN';

// Stokvel Group types
export interface StokvelGroup {
  id: string;
  name: string;
  description?: string;
  contributionAmount: number;
  contributionFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  payoutDay: number;
  totalBalance: number;
  memberCount: number;
  createdAt: string;
}

// Transaction types
export interface Transaction {
  id: string;
  type: 'CONTRIBUTION' | 'PAYOUT' | 'PENALTY' | 'INTEREST';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  description?: string;
  createdAt: string;
  userId: string;
  groupId: string;
}

// Auth types
export interface LoginCredentials {
  phoneNumber: string;
  password: string;
}

export interface RegisterData {
  phoneNumber: string;
  password: string;
  fullName: string;
  email?: string;
  idNumber?: string;
  language?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
  };
  message?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Groups: undefined;
  GroupDetails: { groupId: string };
  Transactions: undefined;
  Profile: undefined;
};
