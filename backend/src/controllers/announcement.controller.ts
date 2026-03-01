import { Request, Response } from 'express';
import { announcementService } from '../services/announcement.service';

export class AnnouncementController {
  async create(req: Request, res: Response) {
    const { title, content, groupId, pinned, expiresAt } = req.body;
    if (!title || !content || !groupId) {
      return res.status(400).json({ success: false, message: 'Title, content, and groupId are required' });
    }
    const result = await announcementService.createAnnouncement({
      title, content, groupId,
      createdBy: (req as any).user.id,
      pinned, expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
    return res.status(result.success ? 201 : 400).json(result);
  }

  async getByGroup(req: Request, res: Response) {
    const groupId = req.params.groupId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await announcementService.getGroupAnnouncements(groupId, (req as any).user.id, page, limit);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async markRead(req: Request, res: Response) {
    const id = req.params.id as string;
    const result = await announcementService.markAsRead(id, (req as any).user.id);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const { title, content, pinned } = req.body;
    const result = await announcementService.updateAnnouncement(id, (req as any).user.id, { title, content, pinned });
    return res.status(result.success ? 200 : 400).json(result);
  }

  async delete(req: Request, res: Response) {
    const id = req.params.id as string;
    const result = await announcementService.deleteAnnouncement(id, (req as any).user.id);
    return res.status(result.success ? 200 : 400).json(result);
  }
}

export const announcementController = new AnnouncementController();
