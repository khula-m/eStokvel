import { CreateStokvelGroupInput, UpdateStokvelGroupInput } from '../models/StokvelGroup.model';
export declare class StokvelGroupService {
    private generateUniqueCode;
    createGroup(data: CreateStokvelGroupInput, createdById: string): Promise<{
        success: boolean;
        data: {
            createdBy: {
                id: string;
                phoneNumber: string;
                fullName: string;
            };
        } & {
            name: string;
            id: string;
            createdAt: Date;
            code: string;
            description: string | null;
            contributionAmount: number;
            contributionFrequency: string;
            payoutDate: Date | null;
            currency: string;
            meetingSchedule: string | null;
            isActive: boolean;
            createdById: string;
        };
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
        data?: undefined;
    }>;
    getGroupById(id: string, userId?: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        data: {
            isMember: boolean;
            members: ({
                user: {
                    id: string;
                    phoneNumber: string;
                    email: string | null;
                    fullName: string;
                };
            } & {
                id: string;
                role: import(".prisma/client").$Enums.MemberRole;
                userId: string;
                stokvelGroupId: string;
                joinedAt: Date;
            })[];
            _count: {
                members: number;
                transactions: number;
            };
            createdBy: {
                id: string;
                phoneNumber: string;
                fullName: string;
            };
            name: string;
            id: string;
            createdAt: Date;
            code: string;
            description: string | null;
            contributionAmount: number;
            contributionFrequency: string;
            payoutDate: Date | null;
            currency: string;
            meetingSchedule: string | null;
            isActive: boolean;
            createdById: string;
        };
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
        data?: undefined;
    }>;
    getGroupByCode(code: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        data: {
            _count: {
                members: number;
            };
            createdBy: {
                id: string;
                phoneNumber: string;
                fullName: string;
            };
        } & {
            name: string;
            id: string;
            createdAt: Date;
            code: string;
            description: string | null;
            contributionAmount: number;
            contributionFrequency: string;
            payoutDate: Date | null;
            currency: string;
            meetingSchedule: string | null;
            isActive: boolean;
            createdById: string;
        };
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
        data?: undefined;
    }>;
    updateGroup(id: string, data: UpdateStokvelGroupInput): Promise<{
        success: boolean;
        data: {
            createdBy: {
                id: string;
                phoneNumber: string;
                fullName: string;
            };
        } & {
            name: string;
            id: string;
            createdAt: Date;
            code: string;
            description: string | null;
            contributionAmount: number;
            contributionFrequency: string;
            payoutDate: Date | null;
            currency: string;
            meetingSchedule: string | null;
            isActive: boolean;
            createdById: string;
        };
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
        data?: undefined;
    }>;
    getUserGroups(userId: string): Promise<{
        success: boolean;
        data: {
            userRole: import(".prisma/client").$Enums.MemberRole;
            isCreator: boolean;
            _count: {
                members: number;
                transactions: number;
            };
            createdBy: {
                id: string;
                phoneNumber: string;
                fullName: string;
            };
            name: string;
            id: string;
            createdAt: Date;
            code: string;
            description: string | null;
            contributionAmount: number;
            contributionFrequency: string;
            payoutDate: Date | null;
            currency: string;
            meetingSchedule: string | null;
            isActive: boolean;
            createdById: string;
        }[];
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
        data?: undefined;
    }>;
    deleteGroup(id: string, userId: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        data: {
            name: string;
            id: string;
            createdAt: Date;
            code: string;
            description: string | null;
            contributionAmount: number;
            contributionFrequency: string;
            payoutDate: Date | null;
            currency: string;
            meetingSchedule: string | null;
            isActive: boolean;
            createdById: string;
        };
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
        data?: undefined;
    }>;
    getGroupStats(groupId: string): Promise<{
        success: boolean;
        data: {
            totalMembers: number;
            totalBalance: number;
            monthlyTarget: number;
            collectedThisMonth: number;
            pendingTransactions: number;
            totalContributions: number;
            totalPayouts: number;
        };
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
        data?: undefined;
    }>;
}
//# sourceMappingURL=stokvelGroup.service.d.ts.map