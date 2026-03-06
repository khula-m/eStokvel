import { Router } from 'express';
import { announcementController } from '../controllers/announcement.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate, createAnnouncementSchema } from '../middleware/zodValidation.middleware';

const router = Router();
router.use(authMiddleware);

// CRUD for announcements
router.post('/', validate(createAnnouncementSchema), announcementController.create.bind(announcementController));
router.get('/group/:groupId', announcementController.getByGroup.bind(announcementController));
router.put('/:id', announcementController.update.bind(announcementController));
router.put('/:id/read', announcementController.markRead.bind(announcementController));
router.delete('/:id', announcementController.delete.bind(announcementController));

export default router;
