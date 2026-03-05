import Redis from 'ioredis';
import logger from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

let redis: Redis | null = null;

/**
 * Get or create Redis client singleton.
 * Returns null if Redis is not available (graceful degradation).
 */
export function getRedisClient(): Redis | null {
  if (redis) return redis;

  try {
    redis = new Redis(REDIS_URL, {
      password: REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 5) {
          logger.warn('Redis: Max reconnection attempts reached, giving up');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redis.on('error', (err) => {
      logger.warn('Redis connection error (non-fatal, using in-memory fallback):', err.message);
    });

    redis.on('close', () => {
      logger.info('Redis connection closed');
    });

    // Attempt connection but don't block startup
    redis.connect().catch((err) => {
      logger.warn('Redis initial connection failed (non-fatal):', err.message);
      redis = null;
    });

    return redis;
  } catch (err: any) {
    logger.warn('Redis client creation failed (non-fatal):', err.message);
    return null;
  }
}

/**
 * Check if Redis is connected and ready
 */
export function isRedisReady(): boolean {
  return redis !== null && redis.status === 'ready';
}

/**
 * Gracefully disconnect Redis
 */
export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis disconnected gracefully');
  }
}

/**
 * Cache helper: get value or compute and cache
 */
export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  computeFn: () => Promise<T>
): Promise<T> {
  if (!isRedisReady()) {
    return computeFn();
  }

  try {
    const cached = await redis!.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch {
    // Cache miss or parse error, compute fresh
  }

  const value = await computeFn();

  try {
    await redis!.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Non-fatal: failed to cache
  }

  return value;
}

/**
 * Invalidate cache keys by pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  if (!isRedisReady()) return;

  try {
    const keys = await redis!.keys(pattern);
    if (keys.length > 0) {
      await redis!.del(...keys);
    }
  } catch {
    // Non-fatal
  }
}
