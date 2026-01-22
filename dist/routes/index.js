"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_routes_1 = __importDefault(require("./auth.routes"));
const stokvel_routes_1 = __importDefault(require("./stokvel.routes"));
const member_routes_1 = __importDefault(require("./member.routes"));
const transaction_routes_1 = __importDefault(require("./transaction.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const router = express_1.default.Router();
router.get('/health', (_req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});
router.use('/auth', auth_routes_1.default);
router.use('/stokvels', stokvel_routes_1.default);
router.use('/members', member_routes_1.default);
router.use('/transactions', transaction_routes_1.default);
router.use('/users', user_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map