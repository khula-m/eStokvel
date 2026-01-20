import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { AuthController } from "../controllers/auth.controller";

const router = express.Router();
const controller = new AuthController();

router.use(authMiddleware);
router.get("/me", controller.getCurrentUser.bind(controller));

export default router;
