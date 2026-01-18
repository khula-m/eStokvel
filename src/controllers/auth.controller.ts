import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { validatePhoneNumber, validatePassword, validateFullName, validateRequest } from "../utils/validation";

const authService = new AuthService();

// Validation functions
const registerValidations = [
  (body: any) => {
    if (!validatePhoneNumber(body.phoneNumber)) {
      return { isValid: false, message: "Please provide a valid phone number" };
    }
    return { isValid: true };
  },
  (body: any) => {
    const result = validatePassword(body.password);
    if (!result.isValid) return result;
    return { isValid: true };
  },
  (body: any) => {
    const result = validateFullName(body.fullName);
    if (!result.isValid) return result;
    return { isValid: true };
  }
];

const loginValidations = [
  (body: any) => {
    if (!validatePhoneNumber(body.phoneNumber)) {
      return { isValid: false, message: "Please provide a valid phone number" };
    }
    return { isValid: true };
  },
  (body: any) => {
    if (!body.password || body.password.trim() === "") {
      return { isValid: false, message: "Password is required" };
    }
    return { isValid: true };
  }
];

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { phoneNumber, password, fullName } = req.body;
      
      // Manual validation
      if (!validatePhoneNumber(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid phone number"
        });
      }
      
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message
        });
      }
      
      const nameValidation = validateFullName(fullName);
      if (!nameValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: nameValidation.message
        });
      }
      
      // Register user
      const result = await authService.register(phoneNumber, password, fullName);
      
      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            id: result.user.id,
          phoneNumber: result.user.phoneNumber,
          fullName: result.user.fullName,
          role: result.user.role,
          createdAt: result.user.createdAt
          },
          token: result.token
        }
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  async login(req: Request, res: Response) {
    try {
      const { phoneNumber, password } = req.body;
      
      // Manual validation
      if (!validatePhoneNumber(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid phone number"
        });
      }
      
      if (!password || password.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Password is required"
        });
      }
      
      // Login user
      const result = await authService.login(phoneNumber, password);
      
      return res.json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: result.user.id,
          phoneNumber: result.user.phoneNumber,
          fullName: result.user.fullName,
          role: result.user.role,
          lastLogin: result.user.lastLogin
          },
          token: result.token
        }
      });
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }
  
  async getCurrentUser(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      
      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            phoneNumber: user.phoneNumber,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            language: user.language,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
          }
        }
      });
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }
}

