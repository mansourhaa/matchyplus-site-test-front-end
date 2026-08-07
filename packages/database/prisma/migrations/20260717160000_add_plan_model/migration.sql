-- CreateTable
CREATE TABLE "Plan" (
    "id" "UserPlan" NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#888888',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "badge" TEXT NOT NULL DEFAULT '',
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "swipes_per_day" INTEGER NOT NULL DEFAULT -1,
    "profiles_per_category" INTEGER NOT NULL DEFAULT -1,
    "messages_per_day" INTEGER NOT NULL DEFAULT -1,
    "actions_per_day" INTEGER NOT NULL DEFAULT -1,
    "boosts_per_month" INTEGER NOT NULL DEFAULT 0,
    "super_connects_per_month" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);
