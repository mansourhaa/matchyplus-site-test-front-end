-- CreateEnum
CREATE TYPE "SwipeDirection" AS ENUM ('LEFT', 'RIGHT', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "goals" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "looking_for" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activity_sector" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "service_type" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profile_type" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gps_latitude" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gps_longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Swipe" (
    "id" TEXT NOT NULL,
    "swiper_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "direction" "SwipeDirection" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Swipe_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SwipeLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "direction" "SwipeDirection" NOT NULL,
    "swiped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwipeLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "user_low_id" TEXT NOT NULL,
    "user_high_id" TEXT NOT NULL,
    "matched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserLocation" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "location_enabled" BOOLEAN NOT NULL DEFAULT true,
    "city" TEXT,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserBlock" (
    "id" TEXT NOT NULL,
    "blocker_id" TEXT NOT NULL,
    "blocked_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "Swipe_swiper_id_target_id_key" ON "Swipe"("swiper_id", "target_id");
CREATE INDEX "Swipe_swiper_id_direction_idx" ON "Swipe"("swiper_id", "direction");
CREATE INDEX "Swipe_target_id_direction_idx" ON "Swipe"("target_id", "direction");

CREATE INDEX "SwipeLog_user_id_swiped_at_direction_idx" ON "SwipeLog"("user_id", "swiped_at", "direction");
CREATE INDEX "SwipeLog_user_id_target_id_idx" ON "SwipeLog"("user_id", "target_id");

CREATE UNIQUE INDEX "Match_user_low_id_user_high_id_key" ON "Match"("user_low_id", "user_high_id");
CREATE INDEX "Match_user_low_id_idx" ON "Match"("user_low_id");
CREATE INDEX "Match_user_high_id_idx" ON "Match"("user_high_id");

CREATE UNIQUE INDEX "UserLocation_user_id_key" ON "UserLocation"("user_id");

CREATE UNIQUE INDEX "UserBlock_blocker_id_blocked_id_key" ON "UserBlock"("blocker_id", "blocked_id");
CREATE INDEX "UserBlock_blocked_id_idx" ON "UserBlock"("blocked_id");

-- ForeignKeys
ALTER TABLE "Swipe" ADD CONSTRAINT "Swipe_swiper_id_fkey" FOREIGN KEY ("swiper_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Swipe" ADD CONSTRAINT "Swipe_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SwipeLog" ADD CONSTRAINT "SwipeLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SwipeLog" ADD CONSTRAINT "SwipeLog_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Match" ADD CONSTRAINT "Match_user_low_id_fkey" FOREIGN KEY ("user_low_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_user_high_id_fkey" FOREIGN KEY ("user_high_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserLocation" ADD CONSTRAINT "UserLocation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
