/**
 * Redis Cache Service
 *
 * Provides typed caching with TTLs for hot query paths.
 * Falls back gracefully when Redis is unavailable.
 *
 * Usage:
 *   const group = await cache.group(id, () => prisma.stokvelGroup.findUnique(...));
 *   await cache.invalidateGroup(id);
 */

import { cacheGetOrSet, invalidateCache, isRedisReady, getRedisClient } from './redis';

// ── TTL Configuration (seconds) ──
const TTL = {
  GROUP_DETAIL: 60,       // Group info rarely changes
  GROUP_LIST: 30,         // User's group list — moderate staleness OK
  GROUP_STATS: 300,       // Stats (5 min) — recalculated after transactions
  MEMBER_LIST: 30,        // Member roster
  SYSTEM_OVERVIEW: 120,   // SuperAdmin dashboard overview
} as const;

// ── Cache Key Builders ──
const keys = {
  group: (id: string) => `cache:group:${id}`,
  groupStats: (id: string) => `cache:group:${id}:stats`,
  groupMembers: (id: string) => `cache:group:${id}:members`,
  userGroups: (userId: string) => `cache:user:${userId}:groups`,
  allGroups: () => `cache:groups:all`,
  systemOverview: () => `cache:system:overview`,
};

// ── Typed Cache Functions ──

export const cache = {
  /**
   * Cache a single group's detail.
   */
  async group<T>(id: string, fetchFn: () => Promise<T>): Promise<T> {
    return cacheGetOrSet(keys.group(id), TTL.GROUP_DETAIL, fetchFn);
  },

  /**
   * Cache group statistics (contribution totals, member counts, etc.).
   */
  async groupStats<T>(id: string, fetchFn: () => Promise<T>): Promise<T> {
    return cacheGetOrSet(keys.groupStats(id), TTL.GROUP_STATS, fetchFn);
  },

  /**
   * Cache a group's member list.
   */
  async groupMembers<T>(groupId: string, fetchFn: () => Promise<T>): Promise<T> {
    return cacheGetOrSet(keys.groupMembers(groupId), TTL.MEMBER_LIST, fetchFn);
  },

  /**
   * Cache a user's list of groups.
   */
  async userGroups<T>(userId: string, fetchFn: () => Promise<T>): Promise<T> {
    return cacheGetOrSet(keys.userGroups(userId), TTL.GROUP_LIST, fetchFn);
  },

  /**
   * Cache the SuperAdmin "all groups" list.
   */
  async allGroups<T>(fetchFn: () => Promise<T>): Promise<T> {
    return cacheGetOrSet(keys.allGroups(), TTL.GROUP_LIST, fetchFn);
  },

  /**
   * Cache the system overview (dashboard stats).
   */
  async systemOverview<T>(fetchFn: () => Promise<T>): Promise<T> {
    return cacheGetOrSet(keys.systemOverview(), TTL.SYSTEM_OVERVIEW, fetchFn);
  },

  // ── Invalidation ──

  /** Invalidate everything related to a specific group. */
  async invalidateGroup(groupId: string): Promise<void> {
    await invalidateCache(`cache:group:${groupId}*`);
    await invalidateCache(keys.allGroups());
    // User group lists may be stale — clear all user caches
    await invalidateCache('cache:user:*:groups');
  },

  /** Invalidate a specific user's group list. */
  async invalidateUserGroups(userId: string): Promise<void> {
    await invalidateCache(keys.userGroups(userId));
  },

  /** Invalidate group stats (call after any transaction completes). */
  async invalidateGroupStats(groupId: string): Promise<void> {
    await invalidateCache(keys.groupStats(groupId));
    await invalidateCache(keys.systemOverview());
  },

  /** Nuke all caches (use sparingly). */
  async invalidateAll(): Promise<void> {
    await invalidateCache('cache:*');
  },

  /** Get Redis cache hit stats for monitoring. */
  async getStats(): Promise<{ connected: boolean; keyCount: number }> {
    if (!isRedisReady()) {
      return { connected: false, keyCount: 0 };
    }
    try {
      const redis = getRedisClient()!;
      const cacheKeys = await redis.keys('cache:*');
      return { connected: true, keyCount: cacheKeys.length };
    } catch {
      return { connected: false, keyCount: 0 };
    }
  },
};

export { TTL, keys as cacheKeys };
