import { Request, Response } from 'express';
import { chatService } from '../services/chat.service';

export class ChatController {
  /**
   * Send a message to a group
   */
  async sendMessage(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { stokvelGroupId, message, messageType } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!stokvelGroupId || !message) {
        return res.status(400).json({
          success: false,
          message: 'stokvelGroupId and message are required'
        });
      }

      if (message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message cannot be empty'
        });
      }

      if (message.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Message too long (max 1000 characters)'
        });
      }

      const result = await chatService.sendMessage(userId, {
        stokvelGroupId,
        message,
        messageType
      });

      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error: any) {
      console.error('Send message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get messages for a group
   */
  async getMessages(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const groupId = req.params.groupId as string;
      const { page = '1', limit = '50' } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!groupId) {
        return res.status(400).json({
          success: false,
          message: 'groupId is required'
        });
      }

      const result = await chatService.getMessages(
        userId,
        groupId as string,
        parseInt(page as string, 10),
        parseInt(limit as string, 10)
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        const statusCode = result.message.includes('not a member') ? 403 : 400;
        return res.status(statusCode).json(result);
      }
    } catch (error: any) {
      console.error('Get messages error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const groupId = req.params.groupId as string;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const result = await chatService.markAsRead(userId, groupId as string);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Mark as read error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const result = await chatService.getUnreadCount(userId);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Get unread count error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export const chatController = new ChatController();
export default chatController;
