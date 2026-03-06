import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate, sendMessageSchema } from '../middleware/zodValidation.middleware';

const router = Router();

// All chat routes require authentication
router.use(authMiddleware);

// Send a message
router.post('/messages', validate(sendMessageSchema), chatController.sendMessage.bind(chatController));

// Get messages for a group
router.get('/groups/:groupId/messages', chatController.getMessages.bind(chatController));

// Mark messages as read for a group
router.put('/groups/:groupId/read', chatController.markAsRead.bind(chatController));

// Get unread message count
router.get('/unread', chatController.getUnreadCount.bind(chatController));

export default router;
