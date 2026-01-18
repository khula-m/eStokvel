import { User } from "@prisma/client";

import * as bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt";
import { prisma } from "../utils/prisma";

const SALT_ROUNDS = 10;

export class AuthService {
  async register(phoneNumber: string, password: string, fullName: string) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { phoneNumber } });
    if (existingUser) {
      throw new Error("User with this phone number already exists");
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        phoneNumber,
        fullName,
        passwordHash,
        language: "en"
      }
    });
    
    // Generate token
    const token = generateToken(user);
    
    return { user, token };
  }
  
  async login(phoneNumber: string, password: string) {
    // Find user
    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      throw new Error("Invalid phone number or password");
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid phone number or password");
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });
    
    // Generate token
    const token = generateToken(user);
    
    return { user, token };
  }
  
  async verifyPIN(_userId: string, _pin: string) {
    // TODO: Implement PIN verification logic
    // For now, return true for testing
    return true;
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
      throw new Error("User not found");
    }
    
    return user;
  }
}




