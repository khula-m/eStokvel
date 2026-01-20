"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const authService = new auth_service_1.AuthService();
class AuthController {
    async register(req, res) {
        try {
            const { phoneNumber, password, fullName, email, role } = req.body;
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
        }
        catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || "Registration failed"
            });
        }
    }
    async login(req, res) {
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
        }
        catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || "Login failed"
            });
        }
    }
    async getCurrentUser(req, res) {
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
        }
        catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || "Failed to get user"
            });
        }
    }
    async verifyPin(req, res) {
        try {
            const { phoneNumber, pin } = req.body;
            if (!phoneNumber || !pin) {
                return res.status(400).json({
                    success: false,
                    message: "Phone number and PIN are required",
                });
            }
            const result = await authService.verifyPin(phoneNumber, pin);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json({
                success: true,
                message: "PIN verified successfully",
                data: result.data,
            });
        }
        catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || "PIN verification failed",
            });
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=auth.controller.js.map