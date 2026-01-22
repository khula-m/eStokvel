"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StokvelGroupController = void 0;
const stokvelGroup_service_1 = require("../services/stokvelGroup.service");
const stokvelGroupService = new stokvelGroup_service_1.StokvelGroupService();
class StokvelGroupController {
    async createGroup(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const input = req.body;
            if (!input.name) {
                return res.status(400).json({
                    success: false,
                    message: 'Group name is required'
                });
            }
            const result = await stokvelGroupService.createGroup(input, userId);
            if (result.success) {
                return res.status(201).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Create group error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async getGroup(req, res) {
        try {
            const id = String(req.params.id);
            const userId = req.user?.id;
            const result = await stokvelGroupService.getGroupById(id, userId);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(404).json(result);
            }
        }
        catch (error) {
            console.error('Get group error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async getGroupByCode(req, res) {
        try {
            const code = String(req.params.code);
            const result = await stokvelGroupService.getGroupByCode(code);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(404).json(result);
            }
        }
        catch (error) {
            console.error('Get group by code error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async updateGroup(req, res) {
        try {
            const id = String(req.params.id);
            const userId = req.user?.id;
            const input = req.body;
            const group = await stokvelGroupService.getGroupById(id, userId);
            if (!group.success || !group.data?.createdBy?.id === userId) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to update this group'
                });
            }
            const result = await stokvelGroupService.updateGroup(id, input);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Update group error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async getUserGroups(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const result = await stokvelGroupService.getUserGroups(userId);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Get user groups error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async deleteGroup(req, res) {
        try {
            const id = String(req.params.id);
            const userId = req.user?.id;
            const result = await stokvelGroupService.deleteGroup(id, userId);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(result.message.includes('not authorized') ? 403 : 400).json(result);
            }
        }
        catch (error) {
            console.error('Delete group error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async getGroupStats(req, res) {
        try {
            const id = String(req.params.id);
            const userId = req.user?.id;
            const group = await stokvelGroupService.getGroupById(id, userId);
            if (!group.success || !group.data?.isMember) {
                return res.status(403).json({
                    success: false,
                    message: 'You must be a member to view group statistics'
                });
            }
            const result = await stokvelGroupService.getGroupStats(id);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Get group stats error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async joinGroup(req, res) {
        try {
            const id = String(req.params.id);
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }
            const result = await stokvelGroupService.joinGroup(id, userId);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('Join group error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message,
            });
        }
    }
    async getGroupMembers(req, res) {
        try {
            const id = String(req.params.id);
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }
            const result = await stokvelGroupService.getGroupMembers(id);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('Get group members error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message,
            });
        }
    }
}
exports.StokvelGroupController = StokvelGroupController;
//# sourceMappingURL=stokvelGroup.controller.js.map