import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { Logger } from 'winston';
import { roleMiddleware } from '@estokvel/shared';

export function userRoutes(prisma: PrismaClient, logger: Logger): Router {
  const router = Router();

  // ── Get user by ID ──
  router.get('/:id', async (req: any, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: { id: true, phoneNumber: true, email: true, fullName: true, role: true, language: true, createdAt: true },
      });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      return res.json({ success: true, data: user });
    } catch (error: any) {
      logger.error('Get user error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get user' });
    }
  });

  // ── Update user profile ──
  router.put('/profile', async (req: any, res: Response) => {
    try {
      const { fullName, email, language } = req.body;
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(fullName && { fullName }),
          ...(email && { email }),
          ...(language && { language }),
        },
        select: { id: true, phoneNumber: true, email: true, fullName: true, role: true, language: true },
      });
      return res.json({ success: true, data: user, message: 'Profile updated' });
    } catch (error: any) {
      logger.error('Update profile error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
  });

  // ── SuperAdmin: Delete Admin ──
  router.delete('/admin/:adminId', roleMiddleware(['SUPERADMIN']), async (req: any, res: Response) => {
    try {
      const adminId = req.params.adminId;
      const admin = await prisma.user.findUnique({ where: { id: adminId } });
      if (!admin) return res.status(404).json({ success: false, message: 'User not found' });
      if (admin.role === 'SUPERADMIN') return res.status(400).json({ success: false, message: 'Cannot delete superadmin' });

      await prisma.user.delete({ where: { id: adminId } });
      return res.json({ success: true, message: 'Admin deleted' });
    } catch (error: any) {
      logger.error('Delete admin error:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete admin' });
    }
  });

  return router;
}
