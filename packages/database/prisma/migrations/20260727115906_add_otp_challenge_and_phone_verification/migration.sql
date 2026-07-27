-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('SIGNUP_VERIFICATION', 'PHONE_LINK', 'PASSWORD_RESET');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone_verified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "auth_provider" SET DEFAULT 'phone';

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "user_id" TEXT,
    "grant_hash" TEXT,
    "grant_expires_at" TIMESTAMP(3),
    "grant_consumed_at" TIMESTAMP(3),
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpChallenge_phone_purpose_idx" ON "OtpChallenge"("phone", "purpose");

-- CreateIndex
CREATE INDEX "OtpChallenge_user_id_idx" ON "OtpChallenge"("user_id");

-- AddForeignKey
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Only one active (unconsumed) challenge per phone+purpose at a time. Prisma's DSL can't
-- express a partial unique index, so it's hand-added here.
CREATE UNIQUE INDEX "OtpChallenge_active_phone_purpose_key" ON "OtpChallenge"("phone", "purpose") WHERE "consumed_at" IS NULL;

-- Backfill: phones registered before purpose-scoped OTP tracking existed were already proven
-- via the prior signup OTP check, so treat them as verified rather than forcing re-verification.
UPDATE "User" SET "phone_verified" = true WHERE "phone" IS NOT NULL;
