import { prisma } from '../utils/prisma';
import { CreateUserInput, LoginInput } from '../models/User.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: CreateUserInput) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { phoneNumber: data.phoneNumber }
      });

      if (existingUser) {
        return {
          success: false,
          message: 'User with this phone number already exists'
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          phoneNumber: data.phoneNumber,
          email: data.email,
          fullName: data.fullName,
          passwordHash: hashedPassword,
          role: data.role || 'MEMBER'
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

      // Generate JWT token
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

    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Registration failed',
        error: error
      };
    }
  }

  /**
   * Login user
   */
  async login(data: LoginInput) {
    try {
      // Find user by phone number
      const user = await prisma.user.findUnique({
        where: { phoneNumber: data.phoneNumber }
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          phoneNumber: user.phoneNumber,
          role: user.role
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      // Return user data (including role)
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

    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Login failed',
        error: error
      };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId: string) {
    try {
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
        throw new Error("User not found");
      }

      return user;
    } catch (error: any) {
      throw new Error(error.message || "Failed to get user");
    }
  }
}
