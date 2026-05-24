import { Request, Response } from 'express';
import { StokvelGroupService } from '../services/stokvelGroup.service';
import { CreateStokvelGroupInput, UpdateStokvelGroupInput } from '../models/StokvelGroup.model';
import logger from '../utils/logger';

const stokvelGroupService = new StokvelGroupService();

export class StokvelGroupController {
  /**
   * Create a new stokvel group
   */
  async createGroup(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const input: CreateStokvelGroupInput = req.body;
      
      // Validate required fields
      if (!input.name) {
        return res.status(400).json({
          success: false,
          message: 'Group name is required'
        });
      }

      const result = await stokvelGroupService.createGroup(input, userId);
      
      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      logger.error('Create group error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get a group by ID
   */
  async getGroup(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const userId = (req as any).user?.id;

      const result = await stokvelGroupService.getGroupById(id, userId);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
      
    } catch (error: any) {
      logger.error('Get group error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get a group by invite code
   */
  async getGroupByCode(req: Request, res: Response) {
    try {
      const code = String(req.params.code);

      const result = await stokvelGroupService.getGroupByCode(code);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
      
    } catch (error: any) {
      logger.error('Get group by code error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update a group
   */
  async updateGroup(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const input: UpdateStokvelGroupInput = req.body;

      // Authorization is enforced upstream by requireAdminRole middleware,
      // which checks Member.role === 'ADMIN' for THIS group. Any group admin
      // (not just the original creator) may update the group.
      const result = await stokvelGroupService.updateGroup(id, input);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      logger.error('Update group error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get all groups for the current user (SUPERADMIN sees all groups)
   */
  async getUserGroups(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // SUPERADMIN sees all groups
      if (userRole === 'SUPERADMIN') {
        const result = await stokvelGroupService.getAllGroups();
        return res.status(result.success ? 200 : 400).json(result);
      }

      const result = await stokvelGroupService.getUserGroups(userId);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      logger.error('Get user groups error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete a group (soft delete)
   */
  async deleteGroup(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      const result = await stokvelGroupService.deleteGroup(id, userId, userRole);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(result.message.includes('not authorized') ? 403 : 400).json(result);
      }
      
    } catch (error: any) {
      logger.error('Delete group error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get group statistics
   */
  async getGroupStats(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      // Admin status is per-group only. SUPERADMIN bypasses; everyone else must
      // be a member of THIS specific group. A user who is admin in Group A must
      // not see Group B's stats just because they hold an ADMIN flag elsewhere.
      if (userRole !== 'SUPERADMIN') {
        const group = await stokvelGroupService.getGroupById(id, userId);
        if (!group.success || !group.data?.isMember) {
          return res.status(403).json({
            success: false,
            message: 'You must be a member to view group statistics'
          });
        }
      }

      const result = await stokvelGroupService.getGroupStats(id);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      logger.error('Get group stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Join a group (membership)
   */
  async joinGroup(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const result = await stokvelGroupService.joinGroup(id, userId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      logger.error('Join group error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get all members of a group
   */
  async getGroupMembers(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const result = await stokvelGroupService.getGroupMembers(id);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      logger.error('Get group members error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}


