import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import logger from '../utils/logger';

const authService = new AuthService();

export class AuthController {

  // ============ LOGIN ============
  async login(req: Request, res: Response) {
    try {
      const { phoneNumber, pin } = req.body;

      if (!phoneNumber || !pin) {
        return res.status(400).json({
          success: false,
          message: "Phone number and PIN are required"
        });
      }

      const result = await authService.login({ phoneNumber, pin });

      if (!result.success) {
        return res.status(401).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      logger.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || "Login failed"
      });
    }
  }

  // ============ CHANGE PIN ============
  async changePin(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      const { currentPin, newPin } = req.body;
      if (!currentPin || !newPin) {
        return res.status(400).json({
          success: false,
          message: "Current PIN and new PIN are required"
        });
      }

      const result = await authService.changePin(userId, { currentPin, newPin });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      logger.error('Change PIN error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || "PIN change failed"
      });
    }
  }

  // ============ SUPERADMIN: Create Admin ============
  async createAdmin(req: any, res: Response) {
    try {
      const createdById = req.user?.id;
      if (!createdById) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      const { phoneNumber, fullName } = req.body;
      if (!phoneNumber || !fullName) {
        return res.status(400).json({
          success: false,
          message: "Phone number and full name are required"
        });
      }

      const result = await authService.createAdmin({ phoneNumber, fullName }, createdById);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error: any) {
      logger.error('Create admin error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create admin"
      });
    }
  }

  // ============ ADMIN: Add Member to Group ============
  async addMember(req: any, res: Response) {
    try {
      const createdById = req.user?.id;
      if (!createdById) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      const { phoneNumber, fullName, groupId } = req.body;
      if (!phoneNumber || !fullName || !groupId) {
        return res.status(400).json({
          success: false,
          message: "Phone number, full name, and group ID are required"
        });
      }

      const result = await authService.addMember({ phoneNumber, fullName, groupId }, createdById);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error: any) {
      logger.error('Add member error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to add member"
      });
    }
  }

  // ============ GET CURRENT USER ============
  async getCurrentUser(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      const result = await authService.getUserById(userId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      logger.error('Get current user error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get user"
      });
    }
  }

  // ============ SUPERADMIN: Delete Admin ============
  async deleteAdmin(req: any, res: Response) {
    try {
      const requesterId = req.user?.id;
      if (!requesterId) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      const adminId = req.params.adminId as string;
      if (!adminId) {
        return res.status(400).json({ success: false, message: "Admin ID is required" });
      }

      const result = await authService.deleteAdmin(adminId, requesterId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      logger.error('Delete admin error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete admin"
      });
    }
  }

  // ============ SUPERADMIN: List Admins ============
  async listAdmins(_req: any, res: Response) {
    try {
      const result = await authService.listAdmins();
      return res.status(200).json(result);
    } catch (error: any) {
      logger.error('List admins error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to list admins"
      });
    }
  }

  // ============ SUPERADMIN: System Overview ============
  async getSystemOverview(_req: any, res: Response) {
    try {
      const result = await authService.getSystemOverview();
      return res.status(200).json(result);
    } catch (error: any) {
      logger.error('System overview error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get system overview"
      });
    }
  }

  // ============ SUPERADMIN LOGIN (Email + Password) ============
  async superadminLogin(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required"
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const result = await authService.superadminLogin({ email, password }, ipAddress);

      if (!result.success) {
        const statusCode = (result as any).locked ? 423 : 401;
        return res.status(statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      logger.error('Superadmin login error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || "Superadmin login failed"
      });
    }
  }
}

export const authController = new AuthController();
