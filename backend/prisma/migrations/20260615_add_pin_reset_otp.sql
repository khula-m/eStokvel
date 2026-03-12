-- CreateTable: PinResetOTP for forgot-pin flow
CREATE TABLE IF NOT EXISTS "pin_reset_otps" (
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

-- CreateIndex
CREATE INDEX "pin_reset_otps_phoneNumber_createdAt_idx" ON "pin_reset_otps"("phoneNumber", "createdAt");
CREATE UNIQUE INDEX "pin_reset_otps_sessionToken_key" ON "pin_reset_otps"("sessionToken");
CREATE INDEX "pin_reset_otps_sessionToken_idx" ON "pin_reset_otps"("sessionToken");
