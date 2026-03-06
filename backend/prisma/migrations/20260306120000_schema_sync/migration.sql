-- ============================================================
-- Migration: Sync schema with all changes since chat_messages
-- Adds: enums, columns, tables, indexes, foreign keys
-- ============================================================

-- ── 1. NEW ENUMS ──
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'MEMBER');
CREATE TYPE "AttendanceStatus" AS ENUM ('GOING', 'MAYBE', 'NOT_GOING');

-- ── 2. ALTER EXISTING ENUMS ──

-- MemberRole: remove TREASURER, SECRETARY, CHAIRPERSON; add ADMIN
ALTER TYPE "MemberRole" RENAME TO "MemberRole_old";
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'MEMBER');
ALTER TABLE "members" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "members" ALTER COLUMN "role" TYPE "MemberRole" USING (
  CASE
    WHEN "role"::text IN ('TREASURER', 'SECRETARY', 'CHAIRPERSON') THEN 'ADMIN'::"MemberRole"
    ELSE "role"::text::"MemberRole"
  END
);
ALTER TABLE "members" ALTER COLUMN "role" SET DEFAULT 'MEMBER'::"MemberRole";
DROP TYPE "MemberRole_old";

-- PaymentMethod: remove CASH, VOUCHER; add EFT, OZOW
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'EFT', 'OZOW');
ALTER TABLE "transactions" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" USING (
  CASE
    WHEN "paymentMethod"::text = 'CASH' THEN 'EFT'::"PaymentMethod"
    WHEN "paymentMethod"::text = 'VOUCHER' THEN 'EFT'::"PaymentMethod"
    ELSE "paymentMethod"::text::"PaymentMethod"
  END
);
DROP TYPE "PaymentMethod_old";

-- TransactionType: remove old values
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
CREATE TYPE "TransactionType" AS ENUM ('CONTRIBUTION', 'PAYOUT', 'EXPENSE', 'ADJUSTMENT');
ALTER TABLE "transactions" ALTER COLUMN "transactionType" TYPE "TransactionType" USING (
  CASE
    WHEN "transactionType"::text IN ('FINE_PAYMENT', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'INTEREST') THEN 'ADJUSTMENT'::"TransactionType"
    ELSE "transactionType"::text::"TransactionType"
  END
);
DROP TYPE "TransactionType_old";

-- ── 3. ALTER "User" TABLE ──

-- Make password nullable
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- Add new columns
ALTER TABLE "User" ADD COLUMN "pin" TEXT;
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'MEMBER';
ALTER TABLE "User" ADD COLUMN "mustChangePin" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "lastLoginIp" TEXT;
ALTER TABLE "User" ADD COLUMN "failedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "createdById" TEXT;

-- Add indexes
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- Add self-referencing FK
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 4. ALTER "stokvel_groups" TABLE ──

ALTER TABLE "stokvel_groups" ADD COLUMN "durationMonths" INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "stokvel_groups" ADD COLUMN "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "stokvel_groups" ADD COLUMN "endDate" TIMESTAMP(3);
ALTER TABLE "stokvel_groups" ADD COLUMN "bankName" TEXT;
ALTER TABLE "stokvel_groups" ADD COLUMN "accountNumber" TEXT;
ALTER TABLE "stokvel_groups" ADD COLUMN "accountHolder" TEXT;
ALTER TABLE "stokvel_groups" ADD COLUMN "branchCode" TEXT;

-- Add indexes
CREATE INDEX "stokvel_groups_isActive_idx" ON "stokvel_groups"("isActive");
CREATE INDEX "stokvel_groups_createdById_idx" ON "stokvel_groups"("createdById");

-- ── 5. ALTER "members" TABLE ──

ALTER TABLE "members" ADD COLUMN "payoutBankName" TEXT;
ALTER TABLE "members" ADD COLUMN "payoutAccountNumber" TEXT;
ALTER TABLE "members" ADD COLUMN "payoutAccountHolder" TEXT;
ALTER TABLE "members" ADD COLUMN "payoutBranchCode" TEXT;
ALTER TABLE "members" ADD COLUMN "nextPayoutOrder" INTEGER;

-- Add indexes
CREATE INDEX "members_stokvelGroupId_idx" ON "members"("stokvelGroupId");
CREATE INDEX "members_userId_idx" ON "members"("userId");

-- ── 6. ALTER "transactions" TABLE ──

ALTER TABLE "transactions" ADD COLUMN "ozowTransactionId" TEXT;
ALTER TABLE "transactions" ADD COLUMN "ozowPaymentStatus" TEXT;
ALTER TABLE "transactions" ADD COLUMN "paidAt" TIMESTAMP(3);

-- Add indexes (some may already exist from chat_messages migration)
CREATE INDEX IF NOT EXISTS "transactions_stokvelGroupId_transactionDate_idx" ON "transactions"("stokvelGroupId", "transactionDate");
CREATE INDEX IF NOT EXISTS "transactions_status_idx" ON "transactions"("status");
CREATE INDEX IF NOT EXISTS "transactions_stokvelGroupId_status_idx" ON "transactions"("stokvelGroupId", "status");
CREATE INDEX IF NOT EXISTS "transactions_memberId_transactionDate_idx" ON "transactions"("memberId", "transactionDate");
CREATE INDEX IF NOT EXISTS "transactions_ozowTransactionId_idx" ON "transactions"("ozowTransactionId");

-- ── 7. ALTER "chat_messages" TABLE ──

ALTER TABLE "chat_messages" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;

-- ── 8. NEW TABLES ──

-- chat_replies
CREATE TABLE "chat_replies" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_replies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "chat_replies_messageId_idx" ON "chat_replies"("messageId");
ALTER TABLE "chat_replies" ADD CONSTRAINT "chat_replies_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_replies" ADD CONSTRAINT "chat_replies_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- announcements
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "announcements_groupId_createdAt_idx" ON "announcements"("groupId", "createdAt");
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "stokvel_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- announcement_reads
CREATE TABLE "announcement_reads" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "announcement_reads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "announcement_reads_announcementId_userId_key" ON "announcement_reads"("announcementId", "userId");
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- meetings
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "meetings_groupId_date_idx" ON "meetings"("groupId", "date");
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "stokvel_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- meeting_attendance
CREATE TABLE "meeting_attendance" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'MAYBE',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "meeting_attendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "meeting_attendance_meetingId_userId_key" ON "meeting_attendance"("meetingId", "userId");
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
