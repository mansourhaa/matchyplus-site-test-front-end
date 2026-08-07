-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "rater_id" TEXT NOT NULL,
    "ratee_id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "Rating_rater_id_ratee_id_key" ON "Rating"("rater_id", "ratee_id");
CREATE INDEX "Rating_ratee_id_idx" ON "Rating"("ratee_id");

-- ForeignKeys
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_rater_id_fkey" FOREIGN KEY ("rater_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_ratee_id_fkey" FOREIGN KEY ("ratee_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
