import express, { Request, Response } from "express";
import compression from 'compression';
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
// SECURITY & PERFORMANCE MIDDLEWARE
// ============================================

// 1. Helmet - Security headers (must be first)
app.use(configureHelmet());

// 2. CORS - Cross-origin resource sharing
app.use(configureCors());

// 3. Response compression (gzip/brotli) — reduces payload ~70%
app.use(compression());

// 4. Rate limiting - Apply general limiter to all routes
app.use(generalLimiter);

// 5. Body parsers with size limits
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
  const mem = process.memoryUsage();
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid,
    memory: {
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
    },
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

// Start server (with optional clustering for multi-core scaling)
if (!process.env.JEST_WORKER_ID) {
  const cluster = require('cluster');
  const os = require('os');
  const WORKERS = parseInt(process.env.WEB_CONCURRENCY || '0', 10) || Math.min(os.cpus().length, 4);
  const USE_CLUSTER = process.env.NODE_ENV === 'production' && WORKERS > 1;

  if (USE_CLUSTER && cluster.isPrimary) {
    logger.info(`Primary ${process.pid} forking ${WORKERS} workers...`);
    for (let i = 0; i < WORKERS; i++) cluster.fork();
    cluster.on('exit', (worker: any, code: number) => {
      logger.warn(`Worker ${worker.process.pid} exited (code ${code}), respawning...`);
      cluster.fork();
    });
  } else {
    // Single worker (or dev mode)
    getRedisClient();

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`\n🚀 eStokvel Backend Server`);
      logger.info(`📡 Port: ${PORT} | PID: ${process.pid}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`⏰ Started: ${new Date().toLocaleString()}`);
      if (process.env.NODE_ENV !== 'production') {
        console.log("\n🔗 http://localhost:" + PORT + "/health");
        console.log("🔑 SUPERADMIN: admin@estokvel.co.za / Admin@2026!");
        console.log("🔑 ADMIN: 0831234567 / PIN: 56789\n");
      }
      startPayoutScheduler();
    });

    // Keep-alive for long-lived connections
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

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
      setTimeout(() => { logger.error("Forced shutdown after timeout"); process.exit(1); }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}
