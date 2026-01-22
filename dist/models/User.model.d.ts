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
    role: string;
    language: string;
    createdAt: Date;
    lastLogin?: Date | null;
}
export declare enum UserRole {
    MEMBER = "MEMBER",
    TREASURER = "TREASURER",
    SECRETARY = "SECRETARY",
    ADMIN = "ADMIN"
}
//# sourceMappingURL=User.model.d.ts.map