-- AlterTable: adds the email-verification fields. `phone`, `auth_provider`, and the
ALTER TABLE "User"
  ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pending_email" TEXT,
  ADD COLUMN "email_verification_code" TEXT,
  ADD COLUMN "email_verification_expires_at" TIMESTAMP(3);
