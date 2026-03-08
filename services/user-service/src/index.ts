import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { createLogger, createPrismaClient, createRedisClient, createCacheHelper } from '@estokvel/shared';
import { authMiddleware, roleMiddleware, errorHandler } from '@estokvel/shared';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';

// ── Bootstrap ──
const SERVICE_NAME = 'user-service';
const PORT = parseInt(process.env.PORT || '3001', 10);

export const logger = createLogger(SERVICE_NAME);
export const prisma = createPrismaClient(SERVICE_NAME);
const redis = createRedisClient(SERVICE_NAME);
export const cache = createCacheHelper(redis);

const app = express();

// ── Middleware ──
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// ── Health & Readiness ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: SERVICE_NAME, uptime: process.uptime() });
});

app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', db: true, cache: cache.isReady() });
  } catch {
    res.status(503).json({ status: 'not ready', db: false, cache: cache.isReady() });
  }
});

// ── Routes ──
app.use('/api/auth', authRoutes(prisma, cache, logger));
app.use('/api/users', authMiddleware, userRoutes(prisma, logger));

// ── Error handler ──
app.use(errorHandler);

// ── Start ──
const server = app.listen(PORT, () => {
  logger.info(`${SERVICE_NAME} running on port ${PORT}`);
});

// ── Graceful shutdown ──
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down ${SERVICE_NAME}...`);
  server.close();
  await cache.disconnect();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
