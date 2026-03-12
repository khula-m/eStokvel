-- ============================================================
-- Migration: Add identity verification fields, PinResetOTP,
--            expoPushToken, and ADMIN to UserRole
-- ============================================================

-- ── 1. NEW ENUMS ──
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING_VERIFY', 'VERIFIED', 'FAILED');

-- ── 2. ALTER UserRole enum to add ADMIN ──
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'MEMBER');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::text::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'MEMBER'::"UserRole";
DROP TYPE "UserRole_old";

-- ── 3. ALTER "User" TABLE — add new columns ──
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "idNumberHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "expoPushToken" TEXT;

-- ── 4. CREATE PinResetOTP TABLE ──
CREATE TABLE "pin_reset_otps" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sessionToken" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pin_reset_otps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pin_reset_otps_sessionToken_key" ON "pin_reset_otps"("sessionToken");
CREATE INDEX "pin_reset_otps_phoneNumber_createdAt_idx" ON "pin_reset_otps"("phoneNumber", "createdAt");
CREATE INDEX "pin_reset_otps_sessionToken_idx" ON "pin_reset_otps"("sessionToken");

-- ── 5. ADDITIONAL INDEXES ──
CREATE INDEX IF NOT EXISTS "members_stokvelGroupId_role_idx" ON "members"("stokvelGroupId", "role");
CREATE INDEX IF NOT EXISTS "members_userId_stokvelGroupId_idx" ON "members"("userId", "stokvelGroupId");
CREATE INDEX IF NOT EXISTS "transactions_memberId_stokvelGroupId_status_idx" ON "transactions"("memberId", "stokvelGroupId", "status");
CREATE INDEX IF NOT EXISTS "transactions_stokvelGroupId_transactionType_status_idx" ON "transactions"("stokvelGroupId", "transactionType", "status");
CREATE INDEX IF NOT EXISTS "transactions_stokvelGroupId_recordDate_idx" ON "transactions"("stokvelGroupId", "recordDate" DESC);
CREATE INDEX IF NOT EXISTS "transactions_memberId_status_idx" ON "transactions"("memberId", "status");
