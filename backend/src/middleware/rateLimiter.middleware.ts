import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiter
// In production, use Redis for distributed rate limiting
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

interface RateLimitOptions {
  windowMs?: number;  // Time window in milliseconds
  max?: number;       // Max requests per window
  message?: string;   // Error message
}

/**
 * Create a rate limiter middleware
 * @param options - Rate limiting options
 */
export const rateLimiter = (options: RateLimitOptions = {}) => {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const max = options.max || 100; // 100 requests per window default
  const message = options.message || 'Too many requests, please try again later';

  return (req: Request, res: Response, next: NextFunction) => {
    // Use IP address as key, fallback to 'unknown'
    const key = (req.ip || req.socket.remoteAddress || 'unknown') as string;
    const now = Date.now();

    // Initialize or reset if window expired
    if (!store[key] || now > store[key].resetTime) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
      return next();
    }

    // Increment count
    store[key].count++;

    // Check if over limit
    if (store[key].count > max) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(store[key].resetTime));
      
      return res.status(429).json({
        success: false,
        message,
        retryAfter
      });
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(max - store[key].count));
    res.setHeader('X-RateLimit-Reset', String(store[key].resetTime));

    next();
  };
};

// Preset rate limiters for different use cases
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 100, // Strict in prod, relaxed in dev
  message: 'Too many authentication attempts, please try again later'
});

export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'API rate limit exceeded'
});

export const strictRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Rate limit exceeded for sensitive operation'
});

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 5 * 60 * 1000);
