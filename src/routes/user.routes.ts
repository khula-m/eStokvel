import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { AuthController } from "../controllers/auth.controller";
import { roleMiddleware } from "../middleware/role.middleware";

const router = express.Router();
const controller = new AuthController();

// Get current user profile (protected - requires valid JWT)
router.get("/me", authMiddleware, controller.getCurrentUser.bind(controller));

// Get all users in user's groups (role-based access control)
router.get(
  "/",
  authMiddleware,
  roleMiddleware(["TREASURER", "CHAIRPERSON", "SECRETARY", "ADMIN"]),
  async (req, res): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized: User ID is missing.",
        });
        return;
      }

      // Logic to get users in same stokvels
      // This would query your database

      res.json({
        success: true,
        data: [], // Array of users in same groups
        message: "Users in your stokvel groups",
        description:
          "This endpoint returns users in your stokvel groups based on your role",
        compliance: [
          "SRS 4.4.2: User authentication enforced",
          "SRS 5.2: Data transmission security",
          "SRS 6.4.6: Role-based access control",
        ],
        userRole: req.user?.role,
        userId: userId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown error occurred.";
      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }
);

export default router;