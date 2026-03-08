import { PrismaClient } from '@prisma/client';

// ── Pool size presets per service role ──
const POOL_PRESETS: Record<string, { poolSize: number; poolTimeout: number }> = {
  'user-service':         { poolSize: 15, poolTimeout: 10 },
  'group-service':        { poolSize: 20, poolTimeout: 10 },
  'transaction-service':  { poolSize: 30, poolTimeout: 15 },
  'payout-service':       { poolSize: 10, poolTimeout: 20 },
  'chat-service':         { poolSize: 10, poolTimeout: 10 },
  'notification-service': { poolSize: 10, poolTimeout: 10 },
};

function buildUrl(baseUrl: string, poolSize: number, poolTimeout: number): string {
  if (!baseUrl) return '';
  if (baseUrl.includes('connection_limit')) return baseUrl;
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}connection_limit=${poolSize}&pool_timeout=${poolTimeout}`;
}

function instrumentClient(client: PrismaClient, serviceName: string, role: 'primary' | 'replica'): void {
  const slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000', 10);
  const tag = `[${serviceName}:${role}]`;

  if (process.env.NODE_ENV === 'production') {
    (client as any).$on('query', (e: any) => {
      if (e.duration > slowQueryThreshold) {
        console.warn(`${tag} Slow query (${e.duration}ms): ${e.query?.substring(0, 200)}`);
      }
    });
  }

  (client as any).$on('error', (e: any) => {
    console.error(`${tag} Prisma error:`, e);
  });
}

/**
 * Creates a PrismaClient connected to the primary (read/write) database.
 * Uses PgBouncer URL if PGBOUNCER_URL is set, otherwise falls back to DATABASE_URL.
 */
export function createPrismaClient(serviceName: string): PrismaClient {
  const preset = POOL_PRESETS[serviceName] || { poolSize: 20, poolTimeout: 10 };
  const poolSize = parseInt(process.env.DATABASE_POOL_SIZE || String(preset.poolSize), 10);
  const poolTimeout = parseInt(process.env.DATABASE_POOL_TIMEOUT || String(preset.poolTimeout), 10);

  // Prefer PgBouncer URL for connection pooling, fall back to direct DATABASE_URL
  const rawUrl = process.env.PGBOUNCER_URL || process.env.DATABASE_URL || '';
  const url = buildUrl(rawUrl, poolSize, poolTimeout);

  const client = new PrismaClient({
    datasourceUrl: url || undefined,
    log: process.env.NODE_ENV === 'production'
      ? [{ emit: 'event', level: 'query' as const }, { emit: 'event', level: 'error' as const }]
      : [{ emit: 'event', level: 'warn' as const }, { emit: 'event', level: 'error' as const }],
  });

  instrumentClient(client, serviceName, 'primary');
  return client;
}

/**
 * Creates an array of PrismaClients connected to read replicas.
 * Set READ_REPLICA_URLS as a comma-separated list of PostgreSQL connection strings.
 * If no replicas are configured, returns an empty array — callers should fall back to primary.
 */
export function createReadReplicas(serviceName: string): PrismaClient[] {
  const replicaUrls = (process.env.READ_REPLICA_URLS || '').split(',').filter(Boolean);
  if (replicaUrls.length === 0) return [];

  const preset = POOL_PRESETS[serviceName] || { poolSize: 20, poolTimeout: 10 };
  // Read replicas get larger pools since they handle the bulk of traffic
  const poolSize = parseInt(process.env.REPLICA_POOL_SIZE || String(Math.ceil(preset.poolSize * 1.5)), 10);
  const poolTimeout = parseInt(process.env.DATABASE_POOL_TIMEOUT || String(preset.poolTimeout), 10);

  return replicaUrls.map((rawUrl, i) => {
    const url = buildUrl(rawUrl.trim(), poolSize, poolTimeout);
    const client = new PrismaClient({
      datasourceUrl: url,
      log: process.env.NODE_ENV === 'production'
        ? [{ emit: 'event', level: 'query' as const }, { emit: 'event', level: 'error' as const }]
        : [{ emit: 'event', level: 'error' as const }],
    });
    instrumentClient(client, serviceName, 'replica');
    console.log(`[${serviceName}] Read replica ${i + 1} configured`);
    return client;
  });
}

/**
 * Encapsulates primary + replicas with automatic read routing.
 * - Writes / transactions always go to primary.
 * - Reads are round-robin distributed across replicas (or fall back to primary).
 */
export interface DatabaseClients {
  /** Primary client — use for writes and transactions */
  primary: PrismaClient;
  /** Get a reader client — returns a replica (round-robin) or primary if no replicas */
  reader: () => PrismaClient;
  /** Disconnect all clients gracefully */
  disconnectAll: () => Promise<void>;
  /** Number of configured read replicas */
  replicaCount: number;
}

export function createDatabaseClients(serviceName: string): DatabaseClients {
  const primary = createPrismaClient(serviceName);
  const replicas = createReadReplicas(serviceName);

  let roundRobinIndex = 0;

  return {
    primary,
    replicaCount: replicas.length,

    reader(): PrismaClient {
      if (replicas.length === 0) return primary;
      const client = replicas[roundRobinIndex % replicas.length];
      roundRobinIndex = (roundRobinIndex + 1) % replicas.length;
      return client;
    },

    async disconnectAll(): Promise<void> {
      await primary.$disconnect();
      await Promise.all(replicas.map((r) => r.$disconnect()));
    },
  };
}
