import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createLogger, createPrismaClient, createRedisClient, createCacheHelper, authMiddleware, errorHandler } from '@estokvel/shared';
import { notificationRoutes } from './routes/notification.routes';
import { announcementRoutes } from './routes/announcement.routes';
import { meetingRoutes } from './routes/meeting.routes';

const app = express();
const PORT = process.env.PORT || 3006;

const logger = createLogger('notification-service');
const prisma = createPrismaClient('notification-service');
const redis = createRedisClient('notification-service');
const cache = createCacheHelper(redis);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Health checks
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() });
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
app.use('/api/notifications', authMiddleware, notificationRoutes(prisma, cache, logger));
app.use('/api/announcements', authMiddleware, announcementRoutes(prisma, cache, logger));
app.use('/api/meetings', authMiddleware, meetingRoutes(prisma, cache, logger));

// Error handler
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`Notification service running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down notification service...`);
  server.close();
  await cache.disconnect();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
