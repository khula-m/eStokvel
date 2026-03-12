-- Add firstName, lastName fields (backfill from fullName)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT NOT NULL DEFAULT '';

-- Backfill: split existing fullName into firstName + lastName
UPDATE "User"
SET "firstName" = SPLIT_PART("fullName", ' ', 1),
    "lastName" = CASE
      WHEN POSITION(' ' IN "fullName") > 0
      THEN SUBSTRING("fullName" FROM POSITION(' ' IN "fullName") + 1)
      ELSE ''
    END
WHERE "firstName" = '' OR "lastName" = '';

-- Add verification status enum and fields
DO $$ BEGIN
  CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING_VERIFY', 'VERIFIED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "idNumberHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP;

-- Drop old idNumber column if it exists (replaced by idNumberHash)
ALTER TABLE "User" DROP COLUMN IF EXISTS "idNumber";

-- Index for verification status filtering
CREATE INDEX IF NOT EXISTS "User_verificationStatus_idx" ON "User" ("verificationStatus");
