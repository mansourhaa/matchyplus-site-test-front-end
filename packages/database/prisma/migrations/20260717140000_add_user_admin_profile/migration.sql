-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED');

-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('FREE', 'PREMIUM', 'PREMIUM_PLUS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "plan" "UserPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "job" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "contact_modes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "experience" TEXT,
ADD COLUMN     "schedule" TEXT,
ADD COLUMN     "price" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reviews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "matches" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "missions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_earnings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_login" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_plan_idx" ON "User"("plan");
