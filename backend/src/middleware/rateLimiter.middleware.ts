import { Request, Response, NextFunction } from 'express';
import { getRedisClient, isRedisReady } from '../utils/redis';
import logger from '../utils/logger';


interface RateLimitOptions {
  windowMs?: number;  // Time window in milliseconds
  max?: number;       // Max requests per window
  message?: string;   // Error message
  prefix?: string;    // Redis key prefix
}

/**
 * Create a rate limiter middleware with Redis backend + in-memory fallback
 */
export const rateLimiter = (options: RateLimitOptions = {}) => {
  const windowMs = options.windowMs || 60 * 1000;
  const max = options.max || 100;
  const message = options.message || 'Too many requests, please try again later';
  const prefix = options.prefix || 'rl';
  const windowSec = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.ip || req.socket.remoteAddress || 'unknown') as string;
    const key = `${prefix}:${ip}`;

    // Auth/sensitive routes: fail closed when Redis is unavailable.
    // Allowing a memory fallback in cluster mode multiplies the effective limit
    // by the number of workers, bypassing brute-force protection.
    if (!isRedisReady()) {
      logger.error(`[RateLimit] Redis unavailable — blocking request on sensitive route (prefix: ${prefix})`);
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Please try again shortly.',
      });
    }

    try {
      const redis = getRedisClient()!;
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowSec);
      }

      const ttl = await redis.ttl(key);
      const resetTime = Date.now() + (ttl > 0 ? ttl * 1000 : windowMs);

      res.setHeader('X-RateLimit-Reset', String(resetTime));

      if (current > max) {
        const retryAfter = ttl > 0 ? ttl : windowSec;
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
          success: false,
          message,
          retryAfter,
        });
      }

      return next();
    } catch (err: any) {
      logger.error('Redis rate limiter error — blocking request to fail safe:', err.message);
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Please try again shortly.',
      });
    }
  };
};

// Preset rate limiters
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  message: 'Too many authentication attempts, please try again later',
  prefix: 'rl:auth'
});

export const superadminRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 30 : 100,
  message: 'Too many login attempts, please try again later',
  prefix: 'rl:sa'
});

export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'API rate limit exceeded',
  prefix: 'rl:api'
});

export const strictRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Rate limit exceeded for sensitive operation',
  prefix: 'rl:strict'
});


