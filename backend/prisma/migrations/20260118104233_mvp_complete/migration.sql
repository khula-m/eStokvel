/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CONTRIBUTION', 'PAYOUT', 'FINE_PAYMENT', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'INTEREST', 'EXPENSE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('TREASURER', 'SECRETARY', 'CHAIRPERSON', 'MEMBER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'VOUCHER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email" TEXT,
ADD COLUMN     "idNumber" TEXT,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "lastLogin" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "stokvel_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "contributionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contributionFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "payoutDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "meetingSchedule" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stokvel_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stokvelGroupId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "stokvelGroupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "referenceNumber" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "recordDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "metadata" JSONB,
    "receiptUrl" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stokvel_groups_code_key" ON "stokvel_groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "members_userId_stokvelGroupId_key" ON "members"("userId", "stokvelGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_referenceNumber_key" ON "transactions"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "stokvel_groups" ADD CONSTRAINT "stokvel_groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_stokvelGroupId_fkey" FOREIGN KEY ("stokvelGroupId") REFERENCES "stokvel_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_stokvelGroupId_fkey" FOREIGN KEY ("stokvelGroupId") REFERENCES "stokvel_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
