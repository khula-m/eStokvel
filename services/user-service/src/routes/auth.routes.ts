import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Logger } from 'winston';
import type { CacheHelper } from '@estokvel/shared';
import { authMiddleware, roleMiddleware, validatePin, JWT_SECRET, JWT_EXPIRES_IN } from '@estokvel/shared';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function normalizePhone(raw: string): string | null {
  let phone = raw.replace(/[\s\-\(\)]/g, '');
  if (phone.startsWith('27') && phone.length === 11) phone = '0' + phone.slice(2);
  if (!/^0\d{9}$/.test(phone)) return null;
  return phone;
}

function generateTempPin(): string {
  let pin: string;
  do {
    pin = Math.floor(10000 + Math.random() * 90000).toString();
  } while (!validatePin(pin).isValid);
  return pin;
}

export function authRoutes(prisma: PrismaClient, cache: CacheHelper, logger: Logger): Router {
  const router = Router();

  // ── Login (PIN-based for members) ──
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { phoneNumber, pin } = req.body;
      if (!phoneNumber || !pin) {
        return res.status(400).json({ success: false, message: 'Phone number and PIN are required' });
      }

      const normalized = normalizePhone(phoneNumber);
      if (!normalized) {
        return res.status(400).json({ success: false, message: 'Invalid phone number format' });
      }

      const user = await prisma.user.findUnique({ where: { phoneNumber: normalized } });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Account lockout check
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS && user.lastFailedLogin) {
        const lockoutExpiry = new Date(user.lastFailedLogin.getTime() + LOCKOUT_DURATION_MS);
        if (new Date() < lockoutExpiry) {
          const minutesLeft = Math.ceil((lockoutExpiry.getTime() - Date.now()) / 60000);
          return res.status(423).json({
            success: false,
            message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
          });
        }
      }

      const pinHash = user.pinHash || (user as any).pin;
      if (!pinHash) {
        return res.status(401).json({ success: false, message: 'Account not set up. Contact an admin.' });
      }

      const isValid = await bcrypt.compare(pin, pinHash);
      if (!isValid) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: { increment: 1 },
            lastFailedLogin: new Date(),
          },
        });
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Reset failed attempts
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lastLogin: new Date() },
      });

      const token = jwt.sign(
        { userId: user.id, phoneNumber: user.phoneNumber, role: user.role },
        JWT_SECRET as jwt.Secret,
        { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
      );

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            phoneNumber: user.phoneNumber,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            language: user.language,
          },
        },
        message: 'Login successful',
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      return res.status(500).json({ success: false, message: 'Login failed' });
    }
  });

  // ── SuperAdmin Login (email + password) ──
  router.post('/superadmin/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || user.role !== 'SUPERADMIN') {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ success: false, message: 'Account not configured for password login' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

      const token = jwt.sign(
        { userId: user.id, phoneNumber: user.phoneNumber, role: user.role },
        JWT_SECRET as jwt.Secret,
        { expiresIn: '2h' }
      );

      return res.json({
        success: true,
        data: { token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } },
        message: 'SuperAdmin login successful',
      });
    } catch (error: any) {
      logger.error('SuperAdmin login error:', error);
      return res.status(500).json({ success: false, message: 'Login failed' });
    }
  });

  // ── Get current user ──
  router.get('/me', authMiddleware, async (req: any, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, phoneNumber: true, email: true, fullName: true, role: true, language: true, createdAt: true, lastLogin: true },
      });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      return res.json({ success: true, data: user });
    } catch (error: any) {
      logger.error('Get current user error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get user' });
    }
  });

  // ── Change PIN ──
  router.post('/change-pin', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { currentPin, newPin } = req.body;
      if (!currentPin || !newPin) {
        return res.status(400).json({ success: false, message: 'Current PIN and new PIN are required' });
      }

      const pinValidation = validatePin(newPin);
      if (!pinValidation.isValid) {
        return res.status(400).json({ success: false, message: pinValidation.message });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const pinHash = user.pinHash || (user as any).pin;
      const isValid = await bcrypt.compare(currentPin, pinHash);
      if (!isValid) return res.status(400).json({ success: false, message: 'Current PIN is incorrect' });

      const newHash = await bcrypt.hash(newPin, 12);
      await prisma.user.update({ where: { id: userId }, data: { pinHash: newHash } });

      return res.json({ success: true, message: 'PIN changed successfully' });
    } catch (error: any) {
      logger.error('Change PIN error:', error);
      return res.status(500).json({ success: false, message: 'PIN change failed' });
    }
  });

  // ── SuperAdmin: Create Admin ──
  router.post('/admin/create', authMiddleware, roleMiddleware(['SUPERADMIN']), async (req: any, res: Response) => {
    try {
      const { phoneNumber, fullName, groupId } = req.body;
      if (!phoneNumber || !fullName) {
        return res.status(400).json({ success: false, message: 'Phone number and full name are required' });
      }

      const normalized = normalizePhone(phoneNumber);
      if (!normalized) {
        return res.status(400).json({ success: false, message: 'Invalid phone number format' });
      }

      const tempPin = generateTempPin();
      const pinHash = await bcrypt.hash(tempPin, 12);

      let user = await prisma.user.findUnique({ where: { phoneNumber: normalized } });
      if (!user) {
        user = await prisma.user.create({
          data: { phoneNumber: normalized, fullName: fullName.trim(), pinHash, role: 'MEMBER' },
        });
      }

      if (groupId) {
        const existing = await prisma.member.findUnique({
          where: { userId_stokvelGroupId: { userId: user.id, stokvelGroupId: groupId } },
        });
        if (!existing) {
          await prisma.member.create({
            data: { userId: user.id, stokvelGroupId: groupId, role: 'ADMIN' },
          });
        } else {
          await prisma.member.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
        }
      }

      return res.status(201).json({
        success: true,
        data: { userId: user.id, phoneNumber: normalized, tempPin },
        message: 'Admin created successfully',
      });
    } catch (error: any) {
      logger.error('Create admin error:', error);
      return res.status(500).json({ success: false, message: 'Failed to create admin' });
    }
  });

  // ── SuperAdmin: List Admins ──
  router.get('/admin/list', authMiddleware, roleMiddleware(['SUPERADMIN']), async (_req: any, res: Response) => {
    try {
      const admins = await prisma.user.findMany({
        where: { role: { not: 'SUPERADMIN' } },
        select: { id: true, phoneNumber: true, fullName: true, email: true, role: true, createdAt: true, lastLogin: true },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ success: true, data: admins });
    } catch (error: any) {
      logger.error('List admins error:', error);
      return res.status(500).json({ success: false, message: 'Failed to list admins' });
    }
  });

  // ── SuperAdmin: System Overview ──
  router.get('/system/overview', authMiddleware, roleMiddleware(['SUPERADMIN']), async (_req: any, res: Response) => {
    try {
      const overview = await cache.getOrSet('cache:system:overview', 120, async () => {
        const [userCount, groupCount, txnCount] = await Promise.all([
          prisma.user.count(),
          prisma.stokvelGroup.count({ where: { isActive: true } }),
          prisma.transaction.count(),
        ]);
        return { totalUsers: userCount, activeGroups: groupCount, totalTransactions: txnCount };
      });
      return res.json({ success: true, data: overview });
    } catch (error: any) {
      logger.error('System overview error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get overview' });
    }
  });

  return router;
}
