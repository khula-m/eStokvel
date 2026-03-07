-- CreateEnum
CREATE TYPE "PayoutModel" AS ENUM ('ROTATING', 'END_OF_TERM');

-- AlterTable
ALTER TABLE "stokvel_groups" ADD COLUMN IF NOT EXISTS "payoutModel" "PayoutModel" NOT NULL DEFAULT 'ROTATING';
ALTER TABLE "stokvel_groups" ADD COLUMN IF NOT EXISTS "termPayoutProcessed" BOOLEAN NOT NULL DEFAULT false;
