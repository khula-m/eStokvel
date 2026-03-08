-- ============================================================================
-- eStokvel Phase 3: Materialized Views for Analytics
-- ============================================================================
-- Purpose: Pre-computed views for dashboard queries that would otherwise
--          require expensive aggregations across large transaction tables.
-- Refresh: Call REFRESH MATERIALIZED VIEW CONCURRENTLY after transactions.
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- 1. Group Balance Summary
--    Used by: group dashboard, admin overview, payout calculations
-- ────────────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_group_balance_summary AS
SELECT
    t."stokvelGroupId"                                      AS group_id,
    g.name                                                   AS group_name,
    COUNT(DISTINCT t."memberId")                             AS active_members,
    COUNT(t.id)                                              AS total_transactions,
    COALESCE(SUM(CASE WHEN t."transactionType" = 'CONTRIBUTION' AND t.status = 'COMPLETED' THEN t.amount ELSE 0 END), 0) AS total_contributions,
    COALESCE(SUM(CASE WHEN t."transactionType" = 'PAYOUT' AND t.status = 'COMPLETED' THEN t.amount ELSE 0 END), 0)       AS total_payouts,
    COALESCE(SUM(CASE WHEN t."transactionType" = 'PENALTY' AND t.status = 'COMPLETED' THEN t.amount ELSE 0 END), 0)      AS total_penalties,
    COALESCE(SUM(CASE WHEN t."transactionType" = 'CONTRIBUTION' AND t.status = 'COMPLETED' THEN t.amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN t."transactionType" = 'PAYOUT' AND t.status = 'COMPLETED' THEN t.amount ELSE 0 END), 0) AS net_balance,
    MAX(t."transactionDate")                                 AS last_transaction_at,
    now()                                                    AS refreshed_at
FROM transactions t
JOIN stokvel_groups g ON g.id = t."stokvelGroupId"
WHERE t.status = 'COMPLETED'
GROUP BY t."stokvelGroupId", g.name
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_gbs_group_id
    ON mv_group_balance_summary (group_id);

-- ────────────────────────────────────────────────────────────────
-- 2. Member Contribution Stats
--    Used by: member profile, contribution history, payout eligibility
-- ────────────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_member_contribution_stats AS
SELECT
    t."memberId"                                             AS member_id,
    t."stokvelGroupId"                                       AS group_id,
    m."userId"                                               AS user_id,
    COUNT(t.id) FILTER (WHERE t."transactionType" = 'CONTRIBUTION' AND t.status = 'COMPLETED')   AS contribution_count,
    COALESCE(SUM(t.amount) FILTER (WHERE t."transactionType" = 'CONTRIBUTION' AND t.status = 'COMPLETED'), 0) AS total_contributed,
    COUNT(t.id) FILTER (WHERE t."transactionType" = 'PAYOUT' AND t.status = 'COMPLETED')         AS payout_count,
    COALESCE(SUM(t.amount) FILTER (WHERE t."transactionType" = 'PAYOUT' AND t.status = 'COMPLETED'), 0)       AS total_received,
    COUNT(t.id) FILTER (WHERE t."transactionType" = 'PENALTY' AND t.status = 'COMPLETED')        AS penalty_count,
    COALESCE(SUM(t.amount) FILTER (WHERE t."transactionType" = 'PENALTY' AND t.status = 'COMPLETED'), 0)      AS total_penalties,
    MIN(t."transactionDate") FILTER (WHERE t."transactionType" = 'CONTRIBUTION' AND t.status = 'COMPLETED') AS first_contribution_at,
    MAX(t."transactionDate") FILTER (WHERE t."transactionType" = 'CONTRIBUTION' AND t.status = 'COMPLETED') AS last_contribution_at,
    now()                                                    AS refreshed_at
FROM transactions t
JOIN members m ON m.id = t."memberId"
GROUP BY t."memberId", t."stokvelGroupId", m."userId"
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_mcs_member_group
    ON mv_member_contribution_stats (member_id, group_id);

CREATE INDEX IF NOT EXISTS idx_mv_mcs_user
    ON mv_member_contribution_stats (user_id);

CREATE INDEX IF NOT EXISTS idx_mv_mcs_group
    ON mv_member_contribution_stats (group_id);

-- ────────────────────────────────────────────────────────────────
-- 3. Monthly Transaction Trends
--    Used by: analytics dashboard, reporting, trend graphs
-- ────────────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_transaction_trends AS
SELECT
    t."stokvelGroupId"                                       AS group_id,
    date_trunc('month', t."transactionDate")                 AS month,
    t."transactionType"                                      AS transaction_type,
    COUNT(t.id)                                              AS transaction_count,
    COALESCE(SUM(t.amount), 0)                               AS total_amount,
    COALESCE(AVG(t.amount), 0)                               AS avg_amount,
    COUNT(DISTINCT t."memberId")                             AS unique_members,
    now()                                                    AS refreshed_at
FROM transactions t
WHERE t.status = 'COMPLETED'
GROUP BY t."stokvelGroupId", date_trunc('month', t."transactionDate"), t."transactionType"
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_mtt_group_month_type
    ON mv_monthly_transaction_trends (group_id, month, transaction_type);

-- ────────────────────────────────────────────────────────────────
-- 4. Pending Transactions Summary (for admin alerts)
-- ────────────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_pending_transactions AS
SELECT
    t."stokvelGroupId"                                       AS group_id,
    g.name                                                   AS group_name,
    COUNT(t.id)                                              AS pending_count,
    COALESCE(SUM(t.amount), 0)                               AS pending_amount,
    MIN(t."transactionDate")                                 AS oldest_pending_at,
    now()                                                    AS refreshed_at
FROM transactions t
JOIN stokvel_groups g ON g.id = t."stokvelGroupId"
WHERE t.status = 'PENDING'
GROUP BY t."stokvelGroupId", g.name
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_pt_group_id
    ON mv_pending_transactions (group_id);

COMMIT;

-- ────────────────────────────────────────────────────────────────
-- Refresh commands (call via pg_cron or application-level scheduler):
--
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_group_balance_summary;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_contribution_stats;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_transaction_trends;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pending_transactions;
-- ────────────────────────────────────────────────────────────────
