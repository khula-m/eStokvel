-- Migration: add Transaction.source field for explicit ledger provenance
--
-- Adds a TransactionSource enum and a `source` column to the transactions
-- table. The enum distinguishes who or what created a ledger row:
--   MEMBER_PAYMENT         — member self-served via /contribute
--   GATEWAY_WEBHOOK        — confirmed by an external gateway callback (Ozow)
--   ADMIN_MANUAL_RECORD    — group admin recorded a cash/EFT receipt
--   SUPERADMIN_ADJUSTMENT  — SuperAdmin correction
--   SYSTEM                 — background job (rotating payout scheduler, etc.)
--
-- Backfill for existing rows uses the safest available signal in this order:
--   1. ozowTransactionId IS NOT NULL              → GATEWAY_WEBHOOK
--   2. transactionType  =  'ADJUSTMENT'           → SUPERADMIN_ADJUSTMENT
--   3. anything else                              → ADMIN_MANUAL_RECORD
--
-- ADMIN_MANUAL_RECORD is the conservative default. Historical /contribute
-- rows will land there too — we cannot retroactively distinguish "member
-- self-paid" from "admin recorded for member" without more signal, and
-- the more privileged-sounding label is the safer assumption when in doubt.

-- 1. Create the enum type.
CREATE TYPE "TransactionSource" AS ENUM (
    'MEMBER_PAYMENT',
    'GATEWAY_WEBHOOK',
    'ADMIN_MANUAL_RECORD',
    'SUPERADMIN_ADJUSTMENT',
    'SYSTEM'
);

-- 2. Add the column with a default so the migration is non-blocking on a
--    live table. New rows inserted between the ALTER and the backfill will
--    get ADMIN_MANUAL_RECORD, which is the same bucket as our fallback so
--    no row ends up mislabelled by interleaving.
ALTER TABLE "transactions"
    ADD COLUMN "source" "TransactionSource" NOT NULL DEFAULT 'ADMIN_MANUAL_RECORD';

-- 3. Backfill existing rows.
--
--    Gateway-confirmed rows first — most specific signal, lowest false-positive
--    risk. Then adjustments. Anything else stays on the default.
UPDATE "transactions"
   SET "source" = 'GATEWAY_WEBHOOK'
 WHERE "ozowTransactionId" IS NOT NULL;

UPDATE "transactions"
   SET "source" = 'SUPERADMIN_ADJUSTMENT'
 WHERE "transactionType" = 'ADJUSTMENT'
   AND "source" = 'ADMIN_MANUAL_RECORD';  -- don't overwrite a gateway-confirmed adjustment, if such a thing exists

-- 4. Index for "show me everything from this gateway / this admin path" queries
--    on the group ledger views. Cheap to add now; expensive to add later if the
--    table grows large.
CREATE INDEX "transactions_source_idx" ON "transactions"("source");
CREATE INDEX "transactions_stokvelGroupId_source_idx" ON "transactions"("stokvelGroupId", "source");
