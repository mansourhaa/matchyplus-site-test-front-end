-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "favorited_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_user_id_favorited_id_key" ON "Favorite"("user_id", "favorited_id");

-- CreateIndex
CREATE INDEX "Favorite_user_id_created_at_idx" ON "Favorite"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "Favorite_favorited_id_idx" ON "Favorite"("favorited_id");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_favorited_id_fkey" FOREIGN KEY ("favorited_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
