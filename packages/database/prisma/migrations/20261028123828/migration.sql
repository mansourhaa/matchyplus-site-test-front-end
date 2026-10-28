-- DropIndex
DROP INDEX "Favorite_user_id_created_at_idx";

-- CreateIndex
CREATE INDEX "Favorite_user_id_created_at_idx" ON "Favorite"("user_id", "created_at" DESC);
