/*
  Warnings:

  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('INDIVIDUAL', 'PROVIDER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "availability_days" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "availability_hours" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "education_level" TEXT,
ADD COLUMN     "educations" JSONB,
ADD COLUMN     "experiences" JSONB,
ADD COLUMN     "offer_service" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboarding_completed_at" TIMESTAMP(3),
ADD COLUMN     "profile_type" "ProfileType",
ADD COLUMN     "sector" TEXT,
ADD COLUMN     "selected_goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "service_type" TEXT,
ALTER COLUMN "name" SET NOT NULL;
