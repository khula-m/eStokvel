import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireAdminRole } from "../middleware/groupSecurity.middleware";
import { StokvelGroupController } from "../controllers/stokvelGroup.controller";

const router = express.Router();
const controller = new StokvelGroupController();

// All routes require auth
router.use(authMiddleware);

// Any authenticated user can create groups (they become admin of the new group)
router.post("/", controller.createGroup.bind(controller));
router.get("/", controller.getUserGroups.bind(controller));
router.get("/code/:code", controller.getGroupByCode.bind(controller));
router.get("/:id", controller.getGroup.bind(controller));
// Per-group admin check for update (requireAdminRole checks Member.role for the group)
router.put("/:id", requireAdminRole, controller.updateGroup.bind(controller));
// Delete: service handles per-group admin + SUPERADMIN override
router.delete("/:id", controller.deleteGroup.bind(controller));
router.post("/:id/join", controller.joinGroup.bind(controller));
router.get("/:id/stats", controller.getGroupStats.bind(controller));
router.get("/:id/members", controller.getGroupMembers.bind(controller));

export default router;
