-- Performance indexes for eStokvel
-- Safe to run multiple times (IF NOT EXISTS)

-- Members: filter admins/members per group
CREATE INDEX IF NOT EXISTS "members_stokvelGroupId_role_idx" ON "members" ("stokvelGroupId", "role");

-- Members: fast membership lookups (composite duplicate of unique constraint — skip if exists)
CREATE INDEX IF NOT EXISTS "members_userId_stokvelGroupId_idx2" ON "members" ("userId", "stokvelGroupId");

-- Transactions: member balance queries
CREATE INDEX IF NOT EXISTS "transactions_memberId_status_idx" ON "transactions" ("memberId", "status");

-- Transactions: recent transactions per group
CREATE INDEX IF NOT EXISTS "transactions_stokvelGroupId_recordDate_idx" ON "transactions" ("stokvelGroupId", "recordDate" DESC);

-- Transactions: group balance calculations, payout checks
CREATE INDEX IF NOT EXISTS "transactions_stokvelGroupId_transactionType_status_idx" ON "transactions" ("stokvelGroupId", "transactionType", "status");

-- Transactions: double-click prevention
CREATE INDEX IF NOT EXISTS "transactions_memberId_stokvelGroupId_status_idx" ON "transactions" ("memberId", "stokvelGroupId", "status");

-- Audit logs: newest-first pagination
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_desc_idx" ON "audit_logs" ("createdAt" DESC);

-- Audit logs: filtered audit queries
CREATE INDEX IF NOT EXISTS "audit_logs_action_result_idx" ON "audit_logs" ("action", "result");
