import { prisma } from '../utils/prisma';

export class AnnouncementService {
  private static readonly MAX_TITLE_LENGTH = 200;
  private static readonly MAX_CONTENT_LENGTH = 5000;

  /**
   * Create an announcement for a group
   */
  async createAnnouncement(data: {
    title: string;
    content: string;
    groupId: string;
    createdBy: string;
    pinned?: boolean;
    expiresAt?: Date;
  }) {
    try {
      // Validate lengths
      if (!data.title || data.title.trim().length === 0) {
        return { success: false, message: 'Title cannot be empty' };
      }
      if (data.title.length > AnnouncementService.MAX_TITLE_LENGTH) {
        return { success: false, message: `Title cannot exceed ${AnnouncementService.MAX_TITLE_LENGTH} characters` };
      }
      if (!data.content || data.content.trim().length === 0) {
        return { success: false, message: 'Content cannot be empty' };
      }
      if (data.content.length > AnnouncementService.MAX_CONTENT_LENGTH) {
        return { success: false, message: `Content cannot exceed ${AnnouncementService.MAX_CONTENT_LENGTH} characters` };
      }

      // Verify the user is an admin/creator of the group
      const membership = await prisma.member.findFirst({
        where: { userId: data.createdBy, stokvelGroupId: data.groupId, role: 'ADMIN' }
      });
      const user = await prisma.user.findUnique({ where: { id: data.createdBy } });
      
      if (!membership && user?.role !== 'SUPERADMIN') {
        return { success: false, message: 'Only group admins can create announcements' };
      }

      const announcement = await prisma.announcement.create({
        data: {
          title: data.title,
          content: data.content,
          groupId: data.groupId,
          createdBy: data.createdBy,
          pinned: data.pinned || false,
          expiresAt: data.expiresAt,
        },
        include: {
          author: { select: { id: true, fullName: true, phoneNumber: true, role: true } },
          _count: { select: { readBy: true } },
        },
      });

      return { success: true, data: announcement, message: 'Announcement created successfully' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to create announcement' };
    }
  }

  /**
   * Get announcements for a group
   */
  async getGroupAnnouncements(groupId: string, userId: string, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const [announcements, total] = await Promise.all([
        prisma.announcement.findMany({
          where: { groupId },
          include: {
            author: { select: { id: true, fullName: true, role: true } },
            _count: { select: { readBy: true } },
            readBy: { where: { userId }, select: { id: true } },
          },
          orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        prisma.announcement.count({ where: { groupId } }),
      ]);

      // Get total members for "seen by" count
      const memberCount = await prisma.member.count({ where: { stokvelGroupId: groupId } });

      const formatted = announcements.map((a: any) => ({
        ...a,
        isRead: a.readBy.length > 0,
        readCount: a._count.readBy,
        totalMembers: memberCount,
        readBy: undefined, // Don't send raw readBy
      }));

      return {
        success: true,
        data: { announcements: formatted, total, page, limit, pages: Math.ceil(total / limit) },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to get announcements' };
    }
  }

  /**
   * Mark an announcement as read
   */
  async markAsRead(announcementId: string, userId: string) {
    try {
      await prisma.announcementRead.upsert({
        where: { announcementId_userId: { announcementId, userId } },
        update: {},
        create: { announcementId, userId },
      });
      return { success: true, message: 'Marked as read' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to mark as read' };
    }
  }

  /**
   * Update an announcement
   */
  async updateAnnouncement(id: string, userId: string, data: { title?: string; content?: string; pinned?: boolean }) {
    try {
      const announcement = await prisma.announcement.findUnique({ where: { id } });
      if (!announcement) return { success: false, message: 'Announcement not found' };
      if (announcement.createdBy !== userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.role !== 'SUPERADMIN') {
          return { success: false, message: 'Only the author can edit this announcement' };
        }
      }

      const updated = await prisma.announcement.update({
        where: { id },
        data,
        include: { author: { select: { id: true, fullName: true, role: true } }, _count: { select: { readBy: true } } },
      });
      return { success: true, data: updated, message: 'Announcement updated' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to update announcement' };
    }
  }

  /**
   * Delete an announcement
   */
  async deleteAnnouncement(id: string, userId: string) {
    try {
      const announcement = await prisma.announcement.findUnique({ where: { id } });
      if (!announcement) return { success: false, message: 'Announcement not found' };
      if (announcement.createdBy !== userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.role !== 'SUPERADMIN') {
          return { success: false, message: 'Only the author can delete this announcement' };
        }
      }

      await prisma.announcement.delete({ where: { id } });
      return { success: true, message: 'Announcement deleted' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to delete announcement' };
    }
  }
}

export const announcementService = new AnnouncementService();
