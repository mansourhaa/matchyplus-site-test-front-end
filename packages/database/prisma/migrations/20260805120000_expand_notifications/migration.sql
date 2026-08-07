-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MATCH';
ALTER TYPE "NotificationType" ADD VALUE 'MATCH_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'MESSAGE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "notify_all" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notify_matches" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notify_messages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notify_views" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notify_email" BOOLEAN NOT NULL DEFAULT true;
