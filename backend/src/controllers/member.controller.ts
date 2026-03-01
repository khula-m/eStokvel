import { Request, Response } from 'express';
import { MemberService } from '../services/member.service';
import { CreateMemberInput, UpdateMemberInput } from '../models/Member.model';

const memberService = new MemberService();

export class MemberController {
  /**
   * Add a member to a group
   */
  async addMember(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const input: CreateMemberInput = req.body;
      
      // Validate required fields
      if (!input.userId || !input.stokvelGroupId) {
        return res.status(400).json({
          success: false,
          message: 'userId and stokvelGroupId are required'
        });
      }

      // Check if current user is a member/admin of the group
      // (In a real app, you'd have proper authorization checks)
      
      const result = await memberService.addMember(input, userId);
      
      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Add member error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get member details by ID
   */
  async getMember(req: Request, res: Response) {
    try {
      const id = String(req.params.id);

      // In a real app, check if user has permission to view this member
      
      const result = await memberService.getMemberById(id);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
      
    } catch (error: any) {
      console.error('Get member error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Update member role
   */
  async updateMember(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const userId = (req as any).user?.id;
      const input: UpdateMemberInput = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Only group ADMINs should be able to update member roles
      
      const result = await memberService.updateMember(id, input);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Update member error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Remove member from group
   */
  async removeMember(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Only group ADMINs should be able to remove members
      
      const result = await memberService.removeMember(id, userId);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Remove member error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get all members of a group
   */
  async getGroupMembers(req: Request, res: Response) {
    try {
      const groupId = String(req.params.groupId);
      const userId = (req as any).user?.id;
      const { role, search } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user is a member of the group
      // (In a real app, implement this check)
      
      const filters: any = {};
      if (role) filters.role = role as string;
      if (search) filters.search = search as string;

      const result = await memberService.getGroupMembers(groupId, filters);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Get group members error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get member statistics
   */
  async getMemberStats(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user is viewing their own stats or has permission
      // (In a real app, implement this check)
      
      const result = await memberService.getMemberStats(id);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
      
    } catch (error: any) {
      console.error('Get member stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Join a group using invite code
   */
  async joinGroupWithCode(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
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
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Join group error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get current user's memberships
   */
  async getMyMemberships(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get all groups where user is a member
      const memberships = await memberService.getGroupMembers(userId, {});
      
      if (memberships.success) {
        return res.status(200).json(memberships);
      } else {
        return res.status(400).json(memberships);
      }
      
    } catch (error: any) {
      console.error('Get my memberships error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}


