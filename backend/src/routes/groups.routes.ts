import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { StokvelGroupController } from "../controllers/stokvelGroup.controller";

const router = express.Router();
const controller = new StokvelGroupController();

// All routes require auth
router.use(authMiddleware);

router.post("/", controller.createGroup.bind(controller));
router.get("/", controller.getUserGroups.bind(controller));
router.get("/code/:code", controller.getGroupByCode.bind(controller));
router.get("/:id", controller.getGroup.bind(controller));
router.post("/:id/join", controller.joinGroup.bind(controller));
router.get("/:id/stats", controller.getGroupStats.bind(controller));
router.get("/:id/members", controller.getGroupMembers.bind(controller));

export default router;
