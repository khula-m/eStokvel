/**
 * Chat Service for eStokvel
 * Handles group chat messaging functionality
 */

import { prisma } from '../utils/prisma';

interface SendMessageInput {
  stokvelGroupId: string;
  message: string;
  messageType?: 'TEXT' | 'ANNOUNCEMENT' | 'SYSTEM';
}

export class ChatService {
  /**
   * Send a message to a group chat
   */
  async sendMessage(senderId: string, data: SendMessageInput) {
    try {
      // Verify sender is a member of the group
      const membership = await prisma.member.findFirst({
        where: {
          userId: senderId,
          stokvelGroupId: data.stokvelGroupId
        }
      });

      if (!membership) {
        return {
          success: false,
          message: 'You are not a member of this group'
        };
      }

      // Only admins can send announcements
      if (data.messageType === 'ANNOUNCEMENT' && membership.role !== 'ADMIN') {
        return {
          success: false,
          message: 'Only group admins can send announcements'
        };
      }

      const chatMessage = await prisma.chatMessage.create({
        data: {
          stokvelGroupId: data.stokvelGroupId,
          senderId,
          message: data.message.trim(),
          messageType: data.messageType || 'TEXT'
        },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true
            }
          }
        }
      });

      return {
        success: true,
        data: chatMessage,
        message: 'Message sent successfully'
      };
    } catch (error: any) {
      console.error('Send message error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send message'
      };
    }
  }

  /**
   * Get messages for a group
   */
  async getMessages(userId: string, groupId: string, page: number = 1, limit: number = 50) {
    try {
      // Verify user is a member of the group
      const membership = await prisma.member.findFirst({
        where: {
          userId,
          stokvelGroupId: groupId
        }
      });

      if (!membership) {
        return {
          success: false,
          message: 'You are not a member of this group'
        };
      }

      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        prisma.chatMessage.findMany({
          where: { stokvelGroupId: groupId },
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.chatMessage.count({
          where: { stokvelGroupId: groupId }
        })
      ]);

      // Reverse to get oldest first (for display)
      const sortedMessages = messages.reverse();

      return {
        success: true,
        data: {
          messages: sortedMessages,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasMore: page * limit < total
          }
        },
        message: 'Messages retrieved successfully'
      };
    } catch (error: any) {
      console.error('Get messages error:', error);
      return {
        success: false,
        message: error.message || 'Failed to retrieve messages'
      };
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(userId: string, groupId: string) {
    try {
      await prisma.chatMessage.updateMany({
        where: {
          stokvelGroupId: groupId,
          senderId: { not: userId },
          isRead: false
        },
        data: { isRead: true }
      });

      return { success: true, message: 'Messages marked as read' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get unread message count for user across all groups
   */
  async getUnreadCount(userId: string) {
    try {
      // Get user's groups
      const memberships = await prisma.member.findMany({
        where: { userId },
        select: { stokvelGroupId: true }
      });

      const groupIds = memberships.map(m => m.stokvelGroupId);

      const unreadCount = await prisma.chatMessage.count({
        where: {
          stokvelGroupId: { in: groupIds },
          senderId: { not: userId },
          isRead: false
        }
      });

      return {
        success: true,
        data: { unreadCount },
        message: 'Unread count retrieved'
      };
    } catch (error: any) {
      return { success: false, data: { unreadCount: 0 }, message: error.message };
    }
  }

  /**
   * Send a system message (for automated notifications in chat)
   */
  async sendSystemMessage(groupId: string, message: string) {
    try {
      // Get group admin (creator) as sender for system messages
      const group = await prisma.stokvelGroup.findUnique({
        where: { id: groupId },
        select: { createdById: true }
      });

      if (!group) {
        return { success: false, message: 'Group not found' };
      }

      const chatMessage = await prisma.chatMessage.create({
        data: {
          stokvelGroupId: groupId,
          senderId: group.createdById,
          message,
          messageType: 'SYSTEM'
        }
      });

      return {
        success: true,
        data: chatMessage,
        message: 'System message sent'
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

export const chatService = new ChatService();
export default chatService;
