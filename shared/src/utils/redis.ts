import Redis from 'ioredis';

export interface CacheHelper {
  getOrSet: <T>(key: string, ttlSeconds: number, computeFn: () => Promise<T>) => Promise<T>;
  invalidate: (pattern: string) => Promise<void>;
  isReady: () => boolean;
  getClient: () => Redis | null;
  disconnect: () => Promise<void>;
}

export function createRedisClient(serviceName: string): Redis | null {
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

  try {
    const redis = new Redis(REDIS_URL, {
      password: REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on('connect', () => console.log(`[${serviceName}] Redis connected`));
    redis.on('error', (err) => console.warn(`[${serviceName}] Redis error (non-fatal):`, err.message));

    redis.connect().catch((err) => {
      console.warn(`[${serviceName}] Redis initial connect failed (non-fatal):`, err.message);
    });

    return redis;
  } catch {
    return null;
  }
}

export function createCacheHelper(redis: Redis | null): CacheHelper {
  const isReady = () => redis !== null && redis.status === 'ready';

  return {
    isReady,
    getClient: () => redis,

    async getOrSet<T>(key: string, ttlSeconds: number, computeFn: () => Promise<T>): Promise<T> {
      if (!isReady()) return computeFn();

      try {
        const cached = await redis!.get(key);
        if (cached) return JSON.parse(cached) as T;
      } catch { /* cache miss */ }

      const value = await computeFn();

      try {
        await redis!.setex(key, ttlSeconds, JSON.stringify(value));
      } catch { /* non-fatal */ }

      return value;
    },

    async invalidate(pattern: string): Promise<void> {
      if (!isReady()) return;
      try {
        const keys = await redis!.keys(pattern);
        if (keys.length > 0) await redis!.del(...keys);
      } catch { /* non-fatal */ }
    },

    async disconnect(): Promise<void> {
      if (redis) {
        await redis.quit();
        console.log('Redis disconnected');
      }
    },
  };
}
