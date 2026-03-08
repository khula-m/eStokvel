-- ============================================================================
-- eStokvel Phase 3: Transaction Table Partitioning by Month
-- ============================================================================
-- Purpose: Partition the transactions table by transactionDate (monthly ranges)
--          to improve query performance for time-bounded queries at 10k+ scale.
--
-- IMPORTANT: Run during a low-traffic maintenance window.
--            This migration creates the partitioned structure and migrates data.
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- 1. Create the partitioned table with same schema as transactions
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions_partitioned (
    id                  TEXT NOT NULL,
    "stokvelGroupId"    TEXT NOT NULL,
    "memberId"          TEXT NOT NULL,
    "transactionType"   "TransactionType" NOT NULL,
    amount              DECIMAL(12,2) NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'ZAR',
    "referenceNumber"   TEXT,
    "paymentMethod"     "PaymentMethod" NOT NULL,
    "transactionDate"   TIMESTAMPTZ NOT NULL,
    "recordDate"        TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"         TIMESTAMPTZ NOT NULL,
    "recordedById"      TEXT NOT NULL,
    status              "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    notes               TEXT,
    metadata            JSONB,
    "receiptUrl"        TEXT,
    "ozowTransactionId" TEXT,
    "ozowPaymentStatus" TEXT,
    "paidAt"            TIMESTAMPTZ,

    CONSTRAINT transactions_partitioned_pkey PRIMARY KEY (id, "transactionDate")
) PARTITION BY RANGE ("transactionDate");

-- ────────────────────────────────────────────────────────────────
-- 2. Create monthly partitions: 12 months back + 12 months forward
--    Plus a default partition for any outliers
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    i INTEGER;
BEGIN
    -- Historical partitions (12 months back)
    FOR i IN REVERSE 12..1 LOOP
        start_date := date_trunc('month', CURRENT_DATE - (i || ' months')::interval);
        end_date := date_trunc('month', CURRENT_DATE - ((i-1) || ' months')::interval);
        partition_name := 'transactions_' || to_char(start_date, 'YYYY_MM');

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF transactions_partitioned
             FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;

    -- Current + future partitions (12 months forward)
    FOR i IN 0..11 LOOP
        start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::interval);
        end_date := date_trunc('month', CURRENT_DATE + ((i+1) || ' months')::interval);
        partition_name := 'transactions_' || to_char(start_date, 'YYYY_MM');

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF transactions_partitioned
             FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;
END $$;

-- Default partition catches anything outside the defined ranges
CREATE TABLE IF NOT EXISTS transactions_default
    PARTITION OF transactions_partitioned DEFAULT;

-- ────────────────────────────────────────────────────────────────
-- 3. Create indexes on the partitioned table
--    (PostgreSQL auto-creates these on each partition)
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_txp_group_date
    ON transactions_partitioned ("stokvelGroupId", "transactionDate" DESC);

CREATE INDEX IF NOT EXISTS idx_txp_member_date
    ON transactions_partitioned ("memberId", "transactionDate" DESC);

CREATE INDEX IF NOT EXISTS idx_txp_group_status
    ON transactions_partitioned ("stokvelGroupId", status);

CREATE INDEX IF NOT EXISTS idx_txp_group_type_status
    ON transactions_partitioned ("stokvelGroupId", "transactionType", status);

CREATE INDEX IF NOT EXISTS idx_txp_member_status
    ON transactions_partitioned ("memberId", status);

CREATE INDEX IF NOT EXISTS idx_txp_reference
    ON transactions_partitioned ("referenceNumber");

CREATE INDEX IF NOT EXISTS idx_txp_ozow_id
    ON transactions_partitioned ("ozowTransactionId");

CREATE INDEX IF NOT EXISTS idx_txp_member_group_status
    ON transactions_partitioned ("memberId", "stokvelGroupId", status);

CREATE INDEX IF NOT EXISTS idx_txp_group_record_date
    ON transactions_partitioned ("stokvelGroupId", "recordDate" DESC);

-- ────────────────────────────────────────────────────────────────
-- 4. Migrate data in batches from old table to partitioned table
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    batch_size INTEGER := 5000;
    total_moved BIGINT := 0;
    batch_moved INTEGER;
BEGIN
    RAISE NOTICE 'Starting data migration to partitioned table...';

    LOOP
        INSERT INTO transactions_partitioned (
            id, "stokvelGroupId", "memberId", "transactionType",
            amount, currency, "referenceNumber", "paymentMethod",
            "transactionDate", "recordDate", "updatedAt", "recordedById",
            status, notes, metadata, "receiptUrl",
            "ozowTransactionId", "ozowPaymentStatus", "paidAt"
        )
        SELECT
            t.id, t."stokvelGroupId", t."memberId", t."transactionType",
            t.amount, t.currency, t."referenceNumber", t."paymentMethod",
            t."transactionDate", t."recordDate", t."updatedAt", t."recordedById",
            t.status, t.notes, t.metadata, t."receiptUrl",
            t."ozowTransactionId", t."ozowPaymentStatus", t."paidAt"
        FROM transactions t
        WHERE NOT EXISTS (
            SELECT 1 FROM transactions_partitioned tp WHERE tp.id = t.id AND tp."transactionDate" = t."transactionDate"
        )
        LIMIT batch_size;

        GET DIAGNOSTICS batch_moved = ROW_COUNT;
        total_moved := total_moved + batch_moved;

        IF batch_moved > 0 THEN
            RAISE NOTICE 'Migrated % rows (total: %)', batch_moved, total_moved;
        END IF;

        EXIT WHEN batch_moved < batch_size;

        -- Brief pause to avoid overwhelming the DB
        PERFORM pg_sleep(0.1);
    END LOOP;

    RAISE NOTICE 'Migration complete. Total rows migrated: %', total_moved;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 5. Add foreign keys (using NOT VALID for initial creation, then validate)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE transactions_partitioned
    ADD CONSTRAINT fk_txp_member
    FOREIGN KEY ("memberId") REFERENCES members(id) NOT VALID;

ALTER TABLE transactions_partitioned
    ADD CONSTRAINT fk_txp_group
    FOREIGN KEY ("stokvelGroupId") REFERENCES stokvel_groups(id) NOT VALID;

ALTER TABLE transactions_partitioned
    ADD CONSTRAINT fk_txp_recorded_by
    FOREIGN KEY ("recordedById") REFERENCES "User"(id) NOT VALID;

-- Validate constraints (can be slow on large datasets but doesn't lock writes)
ALTER TABLE transactions_partitioned VALIDATE CONSTRAINT fk_txp_member;
ALTER TABLE transactions_partitioned VALIDATE CONSTRAINT fk_txp_group;
ALTER TABLE transactions_partitioned VALIDATE CONSTRAINT fk_txp_recorded_by;

COMMIT;

-- ────────────────────────────────────────────────────────────────
-- 6. Swap tables (run separately after verifying data integrity)
-- ────────────────────────────────────────────────────────────────
-- IMPORTANT: Verify row counts match before running the swap!
--
-- SELECT count(*) FROM transactions;
-- SELECT count(*) FROM transactions_partitioned;
--
-- Once verified:
-- BEGIN;
-- ALTER TABLE transactions RENAME TO transactions_old;
-- ALTER TABLE transactions_partitioned RENAME TO transactions;
-- COMMIT;
--
-- After confirming everything works, drop the old table:
-- DROP TABLE transactions_old;
