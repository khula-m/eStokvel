import express from 'express';
import { StokvelGroupController } from '../controllers/stokvelGroup.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const stokvelGroupController = new StokvelGroupController();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Stokvel Group Routes
router.post('/', stokvelGroupController.createGroup.bind(stokvelGroupController));
router.get('/', stokvelGroupController.getUserGroups.bind(stokvelGroupController));
router.get('/:id', stokvelGroupController.getGroup.bind(stokvelGroupController));
router.get('/code/:code', stokvelGroupController.getGroupByCode.bind(stokvelGroupController));
router.put('/:id', stokvelGroupController.updateGroup.bind(stokvelGroupController));
router.delete('/:id', stokvelGroupController.deleteGroup.bind(stokvelGroupController));
router.get('/:id/stats', stokvelGroupController.getGroupStats.bind(stokvelGroupController));

export default router;
