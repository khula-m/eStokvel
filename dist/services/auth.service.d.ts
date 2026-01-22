import { CreateUserInput, LoginInput } from '../models/User.model';
export declare class AuthService {
    register(data: CreateUserInput): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            user: {
                id: string;
                phoneNumber: string;
                email: string | null;
                fullName: string;
                language: string;
                role: import(".prisma/client").$Enums.UserRole;
                createdAt: Date;
            };
            token: string;
        };
        message: string;
    }>;
    login(data: LoginInput): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            user: {
                id: string;
                phoneNumber: string;
                email: string | null;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
                language: string;
                createdAt: Date;
                lastLogin: Date | null;
            };
            token: string;
        };
        message: string;
    }>;
    getCurrentUser(userId: string): Promise<{
        id: string;
        phoneNumber: string;
        email: string | null;
        fullName: string;
        language: string;
        role: import(".prisma/client").$Enums.UserRole;
        createdAt: Date;
        lastLogin: Date | null;
    }>;
    verifyPin(phoneNumber: string, pin: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            id: string;
            phoneNumber: string;
            email: string | null;
            fullName: string;
            idNumber: string | null;
            passwordHash: string;
            language: string;
            role: import(".prisma/client").$Enums.UserRole;
            createdAt: Date;
            updatedAt: Date;
            lastLogin: Date | null;
        };
    }>;
}
//# sourceMappingURL=auth.service.d.ts.map