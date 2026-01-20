import { prisma } from '../utils/prisma';
import { CreateUserInput, LoginInput } from '../models/User.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

export class AuthService {
  async register(data: CreateUserInput) {
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber: data.phoneNumber }
    });

    if (existingUser) {
      return {
        success: false,
        message: 'User with this phone number already exists'
      };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const roleValue = data.role && Object.values(UserRole).includes(data.role as UserRole)
      ? (data.role as UserRole)
      : UserRole.MEMBER;

    const user = await prisma.user.create({
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

    const token = jwt.sign(
      {
        userId: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    return {
      success: true,
      data: {
        user,
        token
      },
      message: 'User registered successfully'
    };
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { phoneNumber: data.phoneNumber }
    });

    if (!user) {
      return {
        success: false,
        message: 'Invalid credentials'
      };
    }

    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      return {
        success: false,
        message: 'Invalid credentials'
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    const token = jwt.sign(
      {
        userId: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

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
      data: {
        user: userData,
        token
      },
      message: 'Login successful'
    };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
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

  async verifyPin(phoneNumber: string, pin: string) {
    const user = await prisma.user.findUnique({
      where: { phoneNumber }
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    const isMatch = await bcrypt.compare(pin, user.passwordHash);

    if (!isMatch) {
      return {
        success: false,
        message: 'Invalid PIN'
      };
    }

    return {
      success: true,
      message: 'PIN verified successfully',
      data: user
    };
  }
}
