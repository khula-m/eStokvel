"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
require("dotenv").config();
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || "5000", 10);
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "eStokvel API v1.0 - Day 4 Ready",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        status: "Authentication working, Day 4 routes ready for testing",
    });
});
app.get("/health", (_req, res) => {
    res.json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
    });
});
if (process.env.NODE_ENV === "development") {
    app.get("/dev/status", (_req, res) => {
        res.json({
            success: true,
            environment: "development",
            hotReload: true,
            routes: ["auth", "groups", "members", "transactions"],
        });
    });
}
if (!process.env.JEST_WORKER_ID) {
    console.log("Loading routes...");
    try {
        const authRoutes = require("./src/routes/auth.routes").default;
        app.use("/api/auth", authRoutes);
        console.log("✅ Auth routes loaded");
    }
    catch (error) {
        console.log("❌ Failed to load auth routes:", error.message);
    }
    try {
        const groupRoutes = require("./src/routes/groups.routes").default;
        app.use("/api/groups", groupRoutes);
        console.log("✅ Group routes loaded");
    }
    catch (error) {
        console.log("❌ Failed to load group routes:", error.message);
    }
    try {
        const stokvelRoutes = require("./src/routes/stokvel.routes").default;
        app.use("/api/stokvels", stokvelRoutes);
        console.log("✅ Stokvel routes loaded");
    }
    catch (error) {
        console.log("❌ Failed to load stokvel routes:", error.message);
    }
    try {
        const memberRoutes = require("./src/routes/member.routes").default;
        app.use("/api/members", memberRoutes);
        console.log("✅ Member routes loaded");
    }
    catch (error) {
        console.log("❌ Failed to load member routes:", error.message);
    }
    try {
        const transactionRoutes = require("./src/routes/transaction.routes").default;
        app.use("/api/transactions", transactionRoutes);
        console.log("✅ Transaction routes loaded");
    }
    catch (error) {
        console.log("❌ Failed to load transaction routes:", error.message);
    }
    try {
        const userRoutes = require("./src/routes/user.routes").default;
        app.use("/api/users", userRoutes);
        console.log("✅ User routes loaded");
    }
    catch (error) {
        console.log("❌ Failed to load user routes:", error.message);
    }
}
const errorHandler = require("./src/middleware/error.middleware");
app.use(errorHandler.errorHandler);
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found",
        path: _req.path,
    });
});
exports.default = app;
if (!process.env.JEST_WORKER_ID) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log("\n🚀 eStokvel Backend Server");
        console.log("📡 Port: " + PORT);
        console.log("🌍 Environment: " + (process.env.NODE_ENV || "development"));
        console.log("⏰ Started: " + new Date().toLocaleString());
        console.log("\n🔗 Available Endpoints:");
        console.log("   http://localhost:" + PORT + "/");
        console.log("   http://localhost:" + PORT + "/health");
        if (process.env.NODE_ENV === "development") {
            console.log("   http://localhost:" + PORT + "/dev/status");
        }
        console.log("\n   🔐 AUTH:");
        console.log("   http://localhost:" + PORT + "/api/auth/register");
        console.log("   http://localhost:" + PORT + "/api/auth/login");
        console.log("   http://localhost:" + PORT + "/api/auth/me (requires token)");
        console.log("\n   👥 GROUPS:");
        console.log("   http://localhost:" + PORT + "/api/groups (GET/POST - requires token)");
        console.log("   http://localhost:" + PORT + "/api/groups/:id (GET - requires token)");
        console.log("\n   💰 TRANSACTIONS:");
        console.log("   http://localhost:" + PORT + "/api/transactions (GET/POST - requires token)");
        console.log("\n🔑 Test Credentials:");
        console.log("   Phone: 27831234567 | Password: password123 | Role: TREASURER");
        console.log("\n📚 Day 4: Core Models & Controllers - READY FOR TESTING");
        console.log("");
    });
}
//# sourceMappingURL=server.js.map