// Correct Prisma setup for 6.19.2
import { PrismaClient, Prisma } from '@prisma/client'
import logger from './logger'

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Connection pool sizing for high-concurrency:
 *  - connection_limit is appended to DATABASE_URL at the Prisma datasource level
 *  - Default Prisma pool = num_cpus * 2 + 1 (~9 on a 4-core)
 *  - For 100K concurrent users behind N workers we raise it per-worker
 *
 * Set DATABASE_POOL_SIZE env var to override (default: 20 per worker).
 */
function createPrismaClient(): PrismaClient {
  const poolSize = parseInt(process.env.DATABASE_POOL_SIZE || '20', 10);
  const poolTimeout = parseInt(process.env.DATABASE_POOL_TIMEOUT || '10', 10);

  // Append pool params to DATABASE_URL if not already present
  let url = process.env.DATABASE_URL || '';
  if (url && !url.includes('connection_limit')) {
    const sep = url.includes('?') ? '&' : '?';
    url += `${sep}connection_limit=${poolSize}&pool_timeout=${poolTimeout}`;
  }

  const client = new PrismaClient({
    datasourceUrl: url || undefined,
    log: process.env.NODE_ENV === 'production'
      ? [{ emit: 'event', level: 'error' }]
      : [{ emit: 'event', level: 'warn' }, { emit: 'event', level: 'error' }],
  });

  // Log slow queries in dev, errors everywhere
  (client as any).$on('error', (e: any) => logger.error('Prisma error:', e));
  if (process.env.NODE_ENV !== 'production') {
    (client as any).$on('warn', (e: any) => logger.warn('Prisma warn:', e));
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Transaction client type for use in prisma.$transaction callbacks.
 * Use: prisma.$transaction(async (tx: TransactionClient) => { ... })
 */
export type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0] extends infer T ? T : never;

/**
 * Safely convert Prisma Decimal to number
 * Use this for all monetary calculations to avoid type errors
 */
export function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return value.toNumber();
}

/**
 * Sum an array of Decimal values
 */
export function sumDecimals(values: (Prisma.Decimal | number | null | undefined)[]): number {
  return values.reduce<number>((sum, val) => sum + toNumber(val), 0);
}
