import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createLogger, createPrismaClient, createRedisClient, createCacheHelper, authMiddleware, errorHandler } from '@estokvel/shared';
import { chatRoutes } from './routes/chat.routes';

const app = express();
const PORT = process.env.PORT || 3005;

const logger = createLogger('chat-service');
const prisma = createPrismaClient('chat-service');
const redis = createRedisClient('chat-service');
const cache = createCacheHelper(redis);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Health checks
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'chat-service', timestamp: new Date().toISOString() });
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

// Routes — all require auth
app.use('/api/chat', authMiddleware, chatRoutes(prisma, cache, logger));

// Error handler
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`Chat service running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down chat service...`);
  server.close();
  await cache.disconnect();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
