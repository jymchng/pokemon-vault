-- CreateEnum
CREATE TYPE "CollectionActivityType" AS ENUM ('CARD_ADDED', 'CARD_REMOVED', 'PACK_OPENED', 'ORDER_COMPLETED', 'REWARD_EARNED', 'REWARD_REDEEMED');

-- CreateTable
CREATE TABLE "CollectionActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "CollectionActivityType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionActivity_userId_createdAt_idx" ON "CollectionActivity"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CollectionActivity_entityType_entityId_idx" ON "CollectionActivity"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "CollectionActivity" ADD CONSTRAINT "CollectionActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

