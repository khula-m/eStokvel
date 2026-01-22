interface JwtPayload {
    userId: string;
    phoneNumber: string;
    role: string;
}
export declare const generateToken: (payload: JwtPayload) => string;
export declare const verifyToken: (token: string) => JwtPayload | null;
export {};
//# sourceMappingURL=jwt.d.ts.map