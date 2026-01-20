"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const prisma_1 = require("../utils/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
class AuthService {
    async register(data) {
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { phoneNumber: data.phoneNumber }
        });
        if (existingUser) {
            return {
                success: false,
                message: 'User with this phone number already exists'
            };
        }
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 10);
        const roleValue = data.role && Object.values(client_1.UserRole).includes(data.role)
            ? data.role
            : client_1.UserRole.MEMBER;
        const user = await prisma_1.prisma.user.create({
            data: {
                phoneNumber: data.phoneNumber,
                email: data.email,
                fullName: data.fullName,
                passwordHash: hashedPassword,
                role: roleValue
            },
            select: {
                id: true,
                phoneNumber: true,
                email: true,
                fullName: true,
                role: true,
                language: true,
                createdAt: true
            }
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, phoneNumber: user.phoneNumber, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
        return {
            success: true,
            data: { user, token },
            message: 'User registered successfully'
        };
    }
    async login(data) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { phoneNumber: data.phoneNumber }
        });
        if (!user) {
            return { success: false, message: 'Invalid credentials' };
        }
        const isValidPassword = await bcryptjs_1.default.compare(data.password, user.passwordHash);
        if (!isValidPassword) {
            return { success: false, message: 'Invalid credentials' };
        }
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, phoneNumber: user.phoneNumber, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
        const userData = {
            id: user.id,
            phoneNumber: user.phoneNumber,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            language: user.language,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
        };
        return {
            success: true,
            data: { user: userData, token },
            message: 'Login successful'
        };
    }
    async getCurrentUser(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                phoneNumber: true,
                email: true,
                fullName: true,
                role: true,
                language: true,
                createdAt: true,
                lastLogin: true
            }
        });
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }
    async verifyPin(phoneNumber, pin) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { phoneNumber }
        });
        if (!user) {
            return { success: false, message: 'User not found' };
        }
        const isMatch = await bcryptjs_1.default.compare(pin, user.passwordHash);
        if (!isMatch) {
            return { success: false, message: 'Invalid PIN' };
        }
        return {
            success: true,
            message: 'PIN verified successfully',
            data: user
        };
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map