-- AlterTable: Google/LinkedIn OAuth provider identifiers.
ALTER TABLE "User"
  ADD COLUMN "google_id" TEXT,
  ADD COLUMN "linkedin_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_google_id_key" ON "User"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_linkedin_id_key" ON "User"("linkedin_id");

-- CreateTable
CREATE TABLE "OAuthExchangeCode" (
    "id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthExchangeCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthExchangeCode_code_hash_key" ON "OAuthExchangeCode"("code_hash");

-- CreateIndex
CREATE INDEX "OAuthExchangeCode_user_id_idx" ON "OAuthExchangeCode"("user_id");

-- AddForeignKey
ALTER TABLE "OAuthExchangeCode" ADD CONSTRAINT "OAuthExchangeCode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
