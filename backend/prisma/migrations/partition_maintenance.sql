-- ============================================================================
-- eStokvel: Auto-create future partitions (run monthly via pg_cron or K8s CronJob)
-- ============================================================================
-- Creates partitions 3 months ahead so they're always ready.
-- Safe to run repeatedly (uses IF NOT EXISTS).
-- ============================================================================

DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    i INTEGER;
BEGIN
    -- Transactions partitions: 3 months ahead
    FOR i IN 0..2 LOOP
        start_date := date_trunc('month', CURRENT_DATE + ((i + 12) || ' months')::interval);
        end_date := date_trunc('month', CURRENT_DATE + ((i + 13) || ' months')::interval);
        partition_name := 'transactions_' || to_char(start_date, 'YYYY_MM');

        BEGIN
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS %I PARTITION OF transactions_partitioned
                 FOR VALUES FROM (%L) TO (%L)',
                partition_name, start_date, end_date
            );
            RAISE NOTICE 'Created/verified partition: %', partition_name;
        EXCEPTION WHEN duplicate_table THEN
            RAISE NOTICE 'Partition % already exists, skipping', partition_name;
        END;
    END LOOP;

    -- Audit log partitions: 3 months ahead
    FOR i IN 0..2 LOOP
        start_date := date_trunc('month', CURRENT_DATE + ((i + 12) || ' months')::interval);
        end_date := date_trunc('month', CURRENT_DATE + ((i + 13) || ' months')::interval);
        partition_name := 'audit_logs_' || to_char(start_date, 'YYYY_MM');

        BEGIN
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs_partitioned
                 FOR VALUES FROM (%L) TO (%L)',
                partition_name, start_date, end_date
            );
            RAISE NOTICE 'Created/verified partition: %', partition_name;
        EXCEPTION WHEN duplicate_table THEN
            RAISE NOTICE 'Partition % already exists, skipping', partition_name;
        END;
    END LOOP;
END $$;
