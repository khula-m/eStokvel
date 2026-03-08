import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createLogger, createPrismaClient, createRedisClient, createCacheHelper, authMiddleware, errorHandler } from '@estokvel/shared';
import { payoutRoutes } from './routes/payout.routes';
import { ozowRoutes } from './routes/ozow.routes';
import { startPayoutScheduler, stopPayoutScheduler } from './jobs/payout.job';

const app = express();
const PORT = process.env.PORT || 3004;

const logger = createLogger('payout-service');
const prisma = createPrismaClient('payout-service');
const redis = createRedisClient('payout-service');
const cache = createCacheHelper(redis);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Health checks
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'payout-service', timestamp: new Date().toISOString() });
});
app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisOk = cache.isReady();
    res.json({ status: 'ready', database: true, cache: redisOk });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

// Ozow webhooks — no auth (verified by hash)
app.use('/api/ozow', ozowRoutes(prisma, logger));

// Authenticated payout routes
app.use('/api/payouts', authMiddleware, payoutRoutes(prisma, cache, logger));

// Error handler
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`Payout service running on port ${PORT}`);
  // Start payout scheduler
  startPayoutScheduler(prisma, logger);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down payout service...`);
  stopPayoutScheduler(logger);
  server.close();
  await cache.disconnect();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
