// User model types
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

export interface User {
  id: string;
  phoneNumber: string;
  email?: string | null;
  fullName: string;
  role: string;  // Added role property
  language: string;
  createdAt: Date;
  lastLogin?: Date | null;
}

export enum UserRole {
  MEMBER = "MEMBER",
  ADMIN = "ADMIN",
  SUPERADMIN = "SUPERADMIN"
}
