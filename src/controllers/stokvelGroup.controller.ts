import { Request, Response } from 'express';
import { StokvelGroupService } from '../services/stokvelGroup.service';
import { CreateStokvelGroupInput, UpdateStokvelGroupInput } from '../models/StokvelGroup.model';

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
      console.error('Create group error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
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
      console.error('Get group error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
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
      console.error('Get group by code error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Update a group
   */
  async updateGroup(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const userId = (req as any).user?.id;
      const input: UpdateStokvelGroupInput = req.body;

      // Verify user is the creator (in a real app, you'd check permissions)
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
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Update group error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get all groups for the current user
   */
  async getUserGroups(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const result = await stokvelGroupService.getUserGroups(userId);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Get user groups error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
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

      const result = await stokvelGroupService.deleteGroup(id, userId);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(result.message.includes('not authorized') ? 403 : 400).json(result);
      }
      
    } catch (error: any) {
      console.error('Delete group error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
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

      // Check if user is a member of the group
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
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Get group stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
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
      console.error('Join group error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
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
      console.error('Get group members error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
}


