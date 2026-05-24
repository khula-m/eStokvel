import { Request, Response } from 'express';
import { announcementService } from '../services/announcement.service';
import { notificationService } from '../services/notification.service';
import logger from '../utils/logger';

export class AnnouncementController {
  async create(req: Request, res: Response) {
    try {
      const { title, content, groupId, pinned, expiresAt } = req.body;
      if (!title || !content || !groupId) {
        return res.status(400).json({ success: false, message: 'Title, content, and groupId are required' });
      }
      const result = await announcementService.createAnnouncement({
        title, content, groupId,
        createdBy: (req as any).user.id,
        pinned, expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });
      if (result.success) {
        const user = (req as any).user;
        notificationService.notifyAnnouncementPosted(groupId, title, user.fullName || 'Admin', user.id)
          .catch((e: any) => logger.warn('Announcement push notification failed:', e));
      }
      return res.status(result.success ? 201 : 400).json(result);
    } catch (error: any) {
      logger.error('Create announcement error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getByGroup(req: Request, res: Response) {
    try {
      const groupId = req.params.groupId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await announcementService.getGroupAnnouncements(groupId, (req as any).user.id, page, limit);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      logger.error('Get announcements error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async markRead(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await announcementService.markAsRead(id, (req as any).user.id);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      logger.error('Mark announcement read error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { title, content, pinned } = req.body;
      const result = await announcementService.updateAnnouncement(id, (req as any).user.id, { title, content, pinned });
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      logger.error('Update announcement error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await announcementService.deleteAnnouncement(id, (req as any).user.id);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      logger.error('Delete announcement error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

export const announcementController = new AnnouncementController();
