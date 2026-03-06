import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import logger from '../utils/logger';
import { getRedisClient, isRedisReady } from '../utils/redis';

// ============================================
// REDIS STORE FOR RATE LIMITING
// ============================================

/**
 * Create a RedisStore for express-rate-limit if Redis is available.
 * Falls back to the default in-memory store when Redis is down.
 */
function createRedisStore(prefix: string): RedisStore | undefined {
  try {
    if (!isRedisReady()) return undefined;
    const client = getRedisClient();
    if (!client) return undefined;

    return new RedisStore({
      // Use ioredis-compatible sendCommand
      sendCommand: (...args: string[]) => client.call(args[0], ...args.slice(1)) as any,
      prefix: `rl:${prefix}:`,
    });
  } catch (err: any) {
    logger.warn(`Redis rate-limit store creation failed for ${prefix}, using in-memory:`, err.message);
    return undefined;
  }
}

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Relaxed in dev
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  store: createRedisStore('general'),
});

/**
 * Auth routes rate limiter (stricter)
 * 5 requests per hour per IP for login endpoints
 * Prevents brute force attacks on PIN and password login
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // Strict in production, relaxed in dev
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again in 1 hour.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  store: createRedisStore('auth'),
});

/**
 * Sensitive operations limiter
 * 10 requests per hour for PIN change, etc.
 */
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    error: 'Too many attempts, please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('sensitive'),
});

// ============================================
// CORS CONFIGURATION
// ============================================

/**
 * List of allowed origins
 * Add your production domains here
 */
const getAllowedOrigins = (): string[] => {
  const origins: string[] = [];
  
  // Always allow localhost in development
  if (process.env.NODE_ENV !== 'production') {
    origins.push(
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:8081', // Expo
      'http://localhost:8082',
      'http://localhost:19006', // Expo web
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:8081',
    );
  }
  
  // Always allow Railway domain for web dashboard & Expo web
  origins.push('https://estokvel-production.up.railway.app');
  
  // Add production origins from environment variable
  // Format: ALLOWED_ORIGINS=https://app.estokvel.com,https://admin.estokvel.com
  if (process.env.ALLOWED_ORIGINS) {
    const prodOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    origins.push(...prodOrigins);
  }
  
  return origins;
};

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400, // 24 hours - cache preflight requests
};

export const configureCors = () => cors(corsOptions);

// ============================================
// HELMET CONFIGURATION
// ============================================

export const helmetOptions = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // Prevent clickjacking
  frameguard: {
    action: 'deny' as const,
  },
  // Hide X-Powered-By header
  hidePoweredBy: true,
  // Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  // Prevent MIME type sniffing
  noSniff: true,
  // XSS Protection
  xssFilter: true,
};

export const configureHelmet = () => helmet(helmetOptions);

// ============================================
// REQUEST SIZE LIMITS
// ============================================

export const jsonLimit = '10kb'; // Limit JSON body size
export const urlEncodedLimit = '10kb'; // Limit URL encoded body size
