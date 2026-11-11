-- AlterTable
ALTER TABLE "User" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "activation_token_hash" TEXT,
ADD COLUMN "activation_token_expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_activation_token_hash_key" ON "User"("activation_token_hash");
