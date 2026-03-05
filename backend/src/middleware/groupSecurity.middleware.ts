import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

// Helper to extract groupId from request
const getGroupIdFromRequest = (req: Request): string | null => {
  // Safely access params, query, and body with null checks
  // Check both :groupId and :id params (groups routes use /:id)
  const paramsGroupId = req.params?.groupId || req.params?.id;
  const queryGroupId = req.query?.groupId as string;
  const bodyGroupId = req.body?.groupId || req.body?.stokvelGroupId;
  
  return paramsGroupId || queryGroupId || bodyGroupId || null;
};

/**
 * Middleware to verify user is a member of the requested group
 * Fixes HIGH PRIORITY security issue: non-members accessing group data
 */
export const requireGroupMembership = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user.id;
    const groupId = getGroupIdFromRequest(req);
    
    if (!groupId) {
      // If no groupId specified, allow access to user's own data
      return next();
    }
    
    // Check if group exists
    const group = await prisma.stokvelGroup.findUnique({
      where: { id: groupId }
    });
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if user is a member of this group
    const membership = await prisma.member.findFirst({
      where: {
        userId,
        stokvelGroupId: groupId
      }
    });
    
    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }
    
    // Attach membership info to request for controllers
    req.membership = membership;
    req.group = group;
    next();
    
  } catch (error) {
    console.error('Group membership check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to verify user has ADMIN role in the group
 * Used for actions only group admins can perform
 */
export const requireAdminRole = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user.id;
    const groupId = getGroupIdFromRequest(req);
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Group ID is required for this action'
      });
    }
    
    // Check if user is an admin of this group
    const membership = await prisma.member.findFirst({
      where: {
        userId,
        stokvelGroupId: groupId,
        role: 'ADMIN'
      }
    });
    
    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can perform this action'
      });
    }
    
    req.membership = membership;
    next();
    return;
    
  } catch (error) {
    console.error('Admin role check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
