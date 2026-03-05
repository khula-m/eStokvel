import { Request, Response, NextFunction } from 'express';
import { getRedisClient, isRedisReady } from '../utils/redis';
import logger from '../utils/logger';

// In-memory fallback store (used when Redis is unavailable)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const memoryStore: RateLimitStore = {};

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

    try {
      // Try Redis-backed rate limiting
      if (isRedisReady()) {
        const redis = getRedisClient()!;
        const current = await redis.incr(key);
        
        if (current === 1) {
          await redis.expire(key, windowSec);
        }

        const ttl = await redis.ttl(key);
        const resetTime = Date.now() + (ttl > 0 ? ttl * 1000 : windowMs);

        res.setHeader('X-RateLimit-Limit', String(max));
        res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - current)));
        res.setHeader('X-RateLimit-Reset', String(resetTime));

        if (current > max) {
          const retryAfter = ttl > 0 ? ttl : windowSec;
          res.setHeader('Retry-After', String(retryAfter));
          return res.status(429).json({
            success: false,
            message,
            retryAfter
          });
        }

        return next();
      }
    } catch (err: any) {
      logger.warn('Redis rate limiter error, falling back to memory:', err.message);
    }

    // In-memory fallback
    const now = Date.now();

    if (!memoryStore[key] || now > memoryStore[key].resetTime) {
      memoryStore[key] = {
        count: 1,
        resetTime: now + windowMs
      };
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(max - 1));
      res.setHeader('X-RateLimit-Reset', String(memoryStore[key].resetTime));
      return next();
    }

    memoryStore[key].count++;

    if (memoryStore[key].count > max) {
      const retryAfter = Math.ceil((memoryStore[key].resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(memoryStore[key].resetTime));
      
      return res.status(429).json({
        success: false,
        message,
        retryAfter
      });
    }

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(max - memoryStore[key].count));
    res.setHeader('X-RateLimit-Reset', String(memoryStore[key].resetTime));

    next();
  };
};

// Preset rate limiters
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  message: 'Too many authentication attempts, please try again later',
  prefix: 'rl:auth'
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

// Cleanup old in-memory entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const key in memoryStore) {
    if (memoryStore[key].resetTime < now) {
      delete memoryStore[key];
    }
  }
}, 5 * 60 * 1000);

