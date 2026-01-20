export declare function validatePhoneNumber(phone: string): boolean;
export declare function validatePassword(password: string): {
    isValid: boolean;
    message?: string;
};
export declare function validateFullName(name: string): {
    isValid: boolean;
    message?: string;
};
export declare function validateRequest(validations: Array<(body: any) => {
    isValid: boolean;
    message?: string;
}>): (req: any, res: any, next: any) => void;
//# sourceMappingURL=validation.d.ts.map