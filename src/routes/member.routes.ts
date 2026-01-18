import express from 'express';
import { MemberController } from '../controllers/member.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const memberController = new MemberController();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Member Routes
router.post('/', memberController.addMember.bind(memberController));
router.get('/:id', memberController.getMember.bind(memberController));
router.put('/:id', memberController.updateMember.bind(memberController));
router.delete('/:id', memberController.removeMember.bind(memberController));
router.get('/:id/stats', memberController.getMemberStats.bind(memberController));
router.get('/group/:groupId', memberController.getGroupMembers.bind(memberController));
router.post('/join', memberController.joinGroupWithCode.bind(memberController));
router.get('/me/memberships', memberController.getMyMemberships.bind(memberController));

export default router;
