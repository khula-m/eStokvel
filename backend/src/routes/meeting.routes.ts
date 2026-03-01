import { Router } from 'express';
import { meetingController } from '../controllers/meeting.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

// CRUD for meetings
router.post('/', meetingController.create.bind(meetingController));
router.get('/group/:groupId', meetingController.getByGroup.bind(meetingController));
router.put('/:id', meetingController.update.bind(meetingController));
router.put('/:id/rsvp', meetingController.rsvp.bind(meetingController));
router.delete('/:id', meetingController.delete.bind(meetingController));

export default router;
