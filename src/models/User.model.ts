// User model types
export interface CreateUserInput {
  phoneNumber: string;
  email?: string;
  fullName: string;
  password: string;
  role?: string;
}

export interface LoginInput {
  phoneNumber: string;
  password: string;
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
  TREASURER = "TREASURER",
  SECRETARY = "SECRETARY",
  ADMIN = "ADMIN"
}
