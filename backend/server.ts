import express, { Request, Response } from "express";
require("dotenv").config();

// Import security middleware
import {
  generalLimiter,
  configureCors,
  configureHelmet,
  jsonLimit,
  urlEncodedLimit,
} from "./src/middleware/security.middleware";

// Import payout scheduler
import { startPayoutScheduler } from "./src/jobs/payout.job";

// Import Redis + logger
import { getRedisClient, disconnectRedis } from "./src/utils/redis";
import logger from "./src/utils/logger";

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

// ============================================
// SECURITY MIDDLEWARE (Order matters!)
// ============================================

// 1. Helmet - Security headers (must be first)
app.use(configureHelmet());

// 2. CORS - Cross-origin resource sharing
app.use(configureCors());

// 3. Rate limiting - Apply general limiter to all routes
app.use(generalLimiter);

// 4. Body parsers with size limits
app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: urlEncodedLimit }));

// Trust proxy for rate limiting behind reverse proxy
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Basic routes
app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "eStokvel API v1.0",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    status: "Authentication working, Day 4 routes ready for testing",
  });
});

app.get("/health", (_req: Request, res: Response) => {
  const { isRedisReady } = require("./src/utils/redis");
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    redis: isRedisReady() ? "connected" : "disconnected",
  });
});

if (process.env.NODE_ENV === "development") {
  app.get("/dev/status", (_req: Request, res: Response) => {
    res.json({
      success: true,
      environment: "development",
      hotReload: true,
      routes: ["auth", "groups", "members", "transactions"],
    });
  });
}

// Load routes via centralized index
if (!process.env.JEST_WORKER_ID) {
  console.log("Loading routes...");
}

try {
  const indexRoutes = require("./src/routes/index").default;
  app.use("/api", indexRoutes);
  if (!process.env.JEST_WORKER_ID) console.log("✅ All routes loaded via index");
} catch (error: any) {
  if (!process.env.JEST_WORKER_ID) console.log("❌ Failed to load routes:", error.message);
}

// Error handling middleware
const errorHandler = require("./src/middleware/error.middleware");
app.use(errorHandler.errorHandler);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    path: _req.path,
  });
});

// Export for testing
export default app;

// Start server
if (!process.env.JEST_WORKER_ID) {
  // Initialize Redis (non-blocking, graceful degradation)
  getRedisClient();

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`\n🚀 eStokvel Backend Server`);
    logger.info(`📡 Port: ${PORT}`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    logger.info(`⏰ Started: ${new Date().toLocaleString()}`);
    console.log("\n🔗 Available Endpoints:");
    console.log("   http://localhost:" + PORT + "/");
    console.log("   http://localhost:" + PORT + "/health");
    if (process.env.NODE_ENV === "development") {
      console.log("   http://localhost:" + PORT + "/dev/status");
    }
    console.log("\n   🔐 AUTH:");
    console.log("   POST http://localhost:" + PORT + "/api/auth/login");
    console.log("   GET  http://localhost:" + PORT + "/api/auth/me (requires token)");
    console.log("   POST http://localhost:" + PORT + "/api/auth/change-pin (requires token)");
    console.log("   POST http://localhost:" + PORT + "/api/auth/admin/create (SUPERADMIN only)");
    console.log("   POST http://localhost:" + PORT + "/api/auth/member/add (ADMIN only)");
    console.log("\n   👥 GROUPS:");
    console.log("   http://localhost:" + PORT + "/api/groups (GET/POST - requires token)");
    console.log("   http://localhost:" + PORT + "/api/groups/:id (GET - requires token)");
    console.log("\n   💰 TRANSACTIONS:");
    console.log("   http://localhost:" + PORT + "/api/transactions (GET/POST - requires token)");
    console.log("\n🔑 Test Credentials (after seed):");
    console.log("   SUPERADMIN: admin@estokvel.co.za / Password: Admin@2026!");
    console.log("   ADMIN:      0831234567 / PIN: 56789 (must change)");
    console.log("   MEMBERS:    0831234568-72 / PIN: 94716 (must change)");
    console.log("\n📚 eStokvel MVP - PIN-based Auth | Role: SUPERADMIN > ADMIN > MEMBER");
    console.log("");

    // Start automatic payout scheduler
    startPayoutScheduler();
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectRedis();
      const { prisma } = require("./src/utils/prisma");
      await prisma.$disconnect();
      logger.info("Server shut down gracefully");
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
