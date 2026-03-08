/**
 * Materialized View Refresh Utility
 *
 * Provides functions to refresh PostgreSQL materialized views used for analytics.
 * Supports concurrent refresh (non-blocking) and tracks refresh status.
 */
import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';

const MATERIALIZED_VIEWS = [
  'mv_group_balance_summary',
  'mv_member_contribution_stats',
  'mv_monthly_transaction_trends',
  'mv_pending_transactions',
] as const;

export type MaterializedViewName = (typeof MATERIALIZED_VIEWS)[number];

export interface ViewRefreshResult {
  view: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

/**
 * Refresh a single materialized view concurrently (non-blocking reads during refresh).
 */
export async function refreshMaterializedView(
  prisma: PrismaClient,
  viewName: MaterializedViewName,
  logger?: Logger,
): Promise<ViewRefreshResult> {
  const start = Date.now();
  // Validate view name against allowlist to prevent SQL injection
  if (!MATERIALIZED_VIEWS.includes(viewName)) {
    return { view: viewName, success: false, durationMs: 0, error: 'Invalid view name' };
  }

  try {
    await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`);
    const durationMs = Date.now() - start;
    logger?.info(`Refreshed ${viewName} in ${durationMs}ms`);
    return { view: viewName, success: true, durationMs };
  } catch (error: any) {
    const durationMs = Date.now() - start;
    logger?.error(`Failed to refresh ${viewName}: ${error.message}`);
    return { view: viewName, success: false, durationMs, error: error.message };
  }
}

/**
 * Refresh all materialized views. Returns results for each view.
 */
export async function refreshAllMaterializedViews(
  prisma: PrismaClient,
  logger?: Logger,
): Promise<ViewRefreshResult[]> {
  const results: ViewRefreshResult[] = [];
  for (const view of MATERIALIZED_VIEWS) {
    results.push(await refreshMaterializedView(prisma, view, logger));
  }
  return results;
}

/**
 * Start a periodic refresh interval for all materialized views.
 * Returns a cleanup function to stop the interval.
 */
export function startViewRefreshScheduler(
  prisma: PrismaClient,
  intervalMs: number = 5 * 60 * 1000, // default 5 minutes
  logger?: Logger,
): () => void {
  let isRefreshing = false;

  const handle = setInterval(async () => {
    if (isRefreshing) return;
    isRefreshing = true;
    try {
      await refreshAllMaterializedViews(prisma, logger);
    } finally {
      isRefreshing = false;
    }
  }, intervalMs);

  logger?.info(`Materialized view refresh scheduled every ${intervalMs / 1000}s`);

  return () => {
    clearInterval(handle);
    logger?.info('Materialized view refresh scheduler stopped');
  };
}
