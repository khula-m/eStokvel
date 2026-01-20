"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberController = void 0;
const member_service_1 = require("../services/member.service");
const memberService = new member_service_1.MemberService();
class MemberController {
    async addMember(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const input = req.body;
            if (!input.userId || !input.stokvelGroupId) {
                return res.status(400).json({
                    success: false,
                    message: 'userId and stokvelGroupId are required'
                });
            }
            const result = await memberService.addMember(input, userId);
            if (result.success) {
                return res.status(201).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Add member error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async getMember(req, res) {
        try {
            const id = String(req.params.id);
            const result = await memberService.getMemberById(id);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(404).json(result);
            }
        }
        catch (error) {
            console.error('Get member error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async updateMember(req, res) {
        try {
            const id = String(req.params.id);
            const userId = req.user?.id;
            const input = req.body;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const result = await memberService.updateMember(id, input);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Update member error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async removeMember(req, res) {
        try {
            const id = String(req.params.id);
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const result = await memberService.removeMember(id, userId);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Remove member error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async getGroupMembers(req, res) {
        try {
            const groupId = String(req.params.groupId);
            const userId = req.user?.id;
            const { role, search } = req.query;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const filters = {};
            if (role)
                filters.role = role;
            if (search)
                filters.search = search;
            const result = await memberService.getGroupMembers(groupId, filters);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Get group members error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async getMemberStats(req, res) {
        try {
            const id = String(req.params.id);
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const result = await memberService.getMemberStats(id);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(404).json(result);
            }
        }
        catch (error) {
            console.error('Get member stats error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async joinGroupWithCode(req, res) {
        try {
            const userId = req.user?.id;
            const { code } = req.body;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: 'Group code is required'
                });
            }
            const result = await memberService.joinGroupWithCode(userId, code);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Join group error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
    async getMyMemberships(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const memberships = await memberService.getGroupMembers(userId, {});
            if (memberships.success) {
                return res.status(200).json(memberships);
            }
            else {
                return res.status(400).json(memberships);
            }
        }
        catch (error) {
            console.error('Get my memberships error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}
exports.MemberController = MemberController;
//# sourceMappingURL=member.controller.js.map