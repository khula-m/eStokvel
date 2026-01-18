import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

// Create service instance
const authService = new AuthService();

export class AuthController {
  /**
   * Register a new user
   */
  async register(req: Request, res: Response) {
    try {
      const { phoneNumber, password, fullName, email, role } = req.body;

      // Validate input
      if (!phoneNumber || !password || !fullName) {
        return res.status(400).json({
          success: false,
          message: "Phone number, password, and full name are required"
        });
      }

      const result = await authService.register({ 
        phoneNumber, 
        password, 
        fullName,
        email,
        role 
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result.data
      });

    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Registration failed"
      });
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response) {
    try {
      const { phoneNumber, password } = req.body;

      if (!phoneNumber || !password) {
        return res.status(400).json({
          success: false,
          message: "Phone number and password are required"
        });
      }

      const result = await authService.login({ phoneNumber, password });

      if (!result.success) {
        return res.status(401).json(result);
      }

      return res.status(200).json(result);

    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Login failed"
      });
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const user = await authService.getCurrentUser(userId);

      return res.status(200).json({
        success: true,
        data: user
      });

    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get user"
      });
    }
  }
}

export const authController = new AuthController();
