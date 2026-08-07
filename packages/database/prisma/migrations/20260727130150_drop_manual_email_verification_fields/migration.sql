/*
  Warnings:

  - You are about to drop the column `email_verification_code` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `email_verification_expires_at` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `pending_email` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "email_verification_code",
DROP COLUMN "email_verification_expires_at",
DROP COLUMN "pending_email";
