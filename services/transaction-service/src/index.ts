import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { createLogger, createDatabaseClients, createRedisClient, createCacheHelper } from '@estokvel/shared';
import { authMiddleware, errorHandler } from '@estokvel/shared';
import { transactionRoutes } from './routes/transaction.routes';
import { paymentRoutes } from './routes/payment.routes';

const SERVICE_NAME = 'transaction-service';
const PORT = parseInt(process.env.PORT || '3003', 10);

export const logger = createLogger(SERVICE_NAME);
const db = createDatabaseClients(SERVICE_NAME);
export const prisma = db.primary;
const redis = createRedisClient(SERVICE_NAME);
export const cache = createCacheHelper(redis);

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// ── Health & Readiness ──
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    uptime: process.uptime(),
    replicas: db.replicaCount,
  });
});
app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', db: true, cache: cache.isReady(), readReplicas: db.replicaCount });
  } catch {
    res.status(503).json({ status: 'not ready', db: false, cache: cache.isReady() });
  }
});

// ── Routes ──
// Pass db.reader for read-heavy routes; writes always use db.primary internally
app.use('/api/transactions', authMiddleware, transactionRoutes(prisma, cache, logger, db.reader));
app.use('/api/payments', authMiddleware, paymentRoutes(prisma, logger));

app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`${SERVICE_NAME} listening on port ${PORT} (${db.replicaCount} read replicas)`);
});

const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down ${SERVICE_NAME}`);
  server.close();
  await cache.disconnect();
  await db.disconnectAll();
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
