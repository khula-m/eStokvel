/**
 * Jest test setup - runs before each test file
 * Provides Prisma mock utilities and test helpers
 */

// Suppress Winston logger output during tests
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Redis to avoid connection attempts during tests
jest.mock('../utils/redis', () => ({
  getRedisClient: jest.fn(() => null),
  isRedisReady: jest.fn(() => false),
  disconnectRedis: jest.fn(),
  cacheGetOrSet: jest.fn((_key: string, _ttl: number, fn: () => Promise<any>) => fn()),
  invalidateCache: jest.fn(),
}));

// Set test environment variables
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';

export {};
