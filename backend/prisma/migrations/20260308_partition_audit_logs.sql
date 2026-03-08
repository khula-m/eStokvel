-- ============================================================================
-- eStokvel Phase 3: Audit Log Table Partitioning by Month
-- ============================================================================
-- Purpose: Partition the audit_logs table by createdAt (monthly ranges)
--          for efficient log rotation and time-bounded queries.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS audit_logs_partitioned (
    id          TEXT NOT NULL,
    action      TEXT NOT NULL,
    entity      TEXT NOT NULL,
    "entityId"  TEXT NOT NULL,
    "userId"    TEXT,
    details     JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT audit_logs_partitioned_pkey PRIMARY KEY (id, "createdAt")
) PARTITION BY RANGE ("createdAt");

-- Create monthly partitions: 6 months back + 12 months forward
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    i INTEGER;
BEGIN
    FOR i IN REVERSE 6..1 LOOP
        start_date := date_trunc('month', CURRENT_DATE - (i || ' months')::interval);
        end_date := date_trunc('month', CURRENT_DATE - ((i-1) || ' months')::interval);
        partition_name := 'audit_logs_' || to_char(start_date, 'YYYY_MM');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs_partitioned
             FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;

    FOR i IN 0..11 LOOP
        start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::interval);
        end_date := date_trunc('month', CURRENT_DATE + ((i+1) || ' months')::interval);
        partition_name := 'audit_logs_' || to_char(start_date, 'YYYY_MM');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs_partitioned
             FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs_default
    PARTITION OF audit_logs_partitioned DEFAULT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alp_entity
    ON audit_logs_partitioned (entity, "entityId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_alp_user
    ON audit_logs_partitioned ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_alp_action
    ON audit_logs_partitioned (action, "createdAt" DESC);

-- Migrate data in batches
DO $$
DECLARE
    batch_size INTEGER := 5000;
    total_moved BIGINT := 0;
    batch_moved INTEGER;
BEGIN
    LOOP
        INSERT INTO audit_logs_partitioned (id, action, entity, "entityId", "userId", details, "createdAt")
        SELECT a.id, a.action, a.entity, a."entityId", a."userId", a.details, a."createdAt"
        FROM audit_logs a
        WHERE NOT EXISTS (
            SELECT 1 FROM audit_logs_partitioned ap WHERE ap.id = a.id AND ap."createdAt" = a."createdAt"
        )
        LIMIT batch_size;

        GET DIAGNOSTICS batch_moved = ROW_COUNT;
        total_moved := total_moved + batch_moved;
        EXIT WHEN batch_moved < batch_size;
        PERFORM pg_sleep(0.1);
    END LOOP;

    RAISE NOTICE 'Audit logs migration complete. Total: %', total_moved;
END $$;

ALTER TABLE audit_logs_partitioned
    ADD CONSTRAINT fk_alp_user
    FOREIGN KEY ("userId") REFERENCES "User"(id) NOT VALID;

ALTER TABLE audit_logs_partitioned VALIDATE CONSTRAINT fk_alp_user;

COMMIT;

-- Swap (run after verifying counts):
-- BEGIN;
-- ALTER TABLE audit_logs RENAME TO audit_logs_old;
-- ALTER TABLE audit_logs_partitioned RENAME TO audit_logs;
-- COMMIT;
