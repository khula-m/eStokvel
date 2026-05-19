import express, { Request, Response } from "express";
import compression from 'compression';
import { randomUUID } from 'crypto';
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

// Normalise NODE_ENV (Railway sometimes injects leading '=')
if (process.env.NODE_ENV) {
  process.env.NODE_ENV = process.env.NODE_ENV.replace(/^=/, '').trim();
}

// ============================================
// SECURITY & PERFORMANCE MIDDLEWARE
// ============================================

// 0. Trust proxy — MUST be before rate limiter on Railway/Heroku/etc.
// Always enable: Railway, Render, Heroku etc. always proxy via load balancer
app.set("trust proxy", 1);

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

// X-Request-ID: attach a correlation ID to every request and response
app.use((req: Request, res: Response, next) => {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  (req as any).id = id;
  res.setHeader('X-Request-ID', id);
  next();
});

// Public routes — minimal information exposure
app.get("/", (_req: Request, res: Response) => {
  res.json({ success: true, message: "eStokvel API", version: "1.0.0" });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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
  logger.info("Loading routes...");
}

try {
  const indexRoutes = require("./src/routes/index").default;
  app.use("/api", indexRoutes);
  if (!process.env.JEST_WORKER_ID) logger.info("All routes loaded via index");
} catch (error: any) {
  if (!process.env.JEST_WORKER_ID) logger.error("Failed to load routes:", error.message);
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

// ============================================
// GLOBAL CRASH HANDLERS (must be registered early)
// ============================================
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Promise Rejection:', reason?.stack || reason);
  // In production, let the process manager restart us
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error.stack || error.message);
  // Always exit on uncaught exceptions — state may be corrupt
  process.exit(1);
});

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
      logger.info(`eStokvel Backend Server started`);
      logger.info(`Port: ${PORT} | PID: ${process.pid} | ENV: ${process.env.NODE_ENV || "development"}`);
      logger.info(`Started: ${new Date().toISOString()}`);
      if (process.env.NODE_ENV !== 'production') {
        logger.debug(`Health: http://localhost:${PORT}/health`);
      }
      startPayoutScheduler();
    });

    // Keep-alive for long-lived connections (> ALB default 60s)
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
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
