import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Simple test routes
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Transaction routes are working!",
    user: (req as any).user
  });
});

export default router;
