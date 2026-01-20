import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Simple test routes
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Stokvel routes are working!",
    user: (req as any).user
  });
});

router.post("/", (req, res) => {
  res.json({
    success: true,
    message: "Would create stokvel here",
    data: req.body
  });
});

// Add join group route
router.post("/:id/join", (req, res) => {
  const { id } = req.params;
  // Logic to join a group by ID
  res.json({
    success: true,
    message: `Joined group with ID: ${id}`
  });
});

export default router;
