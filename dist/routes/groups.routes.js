"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const stokvelGroup_controller_1 = require("../controllers/stokvelGroup.controller");
const router = express_1.default.Router();
const controller = new stokvelGroup_controller_1.StokvelGroupController();
router.use(auth_middleware_1.authMiddleware);
router.post("/", controller.createGroup.bind(controller));
router.get("/", controller.getUserGroups.bind(controller));
router.get("/code/:code", controller.getGroupByCode.bind(controller));
router.get("/:id", controller.getGroup.bind(controller));
router.post("/:id/join", controller.joinGroup.bind(controller));
router.get("/:id/stats", controller.getGroupStats.bind(controller));
router.get("/:id/members", controller.getGroupMembers.bind(controller));
exports.default = router;
//# sourceMappingURL=groups.routes.js.map