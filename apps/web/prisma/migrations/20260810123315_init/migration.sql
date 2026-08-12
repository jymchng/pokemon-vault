-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "set" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "owned" BOOLEAN NOT NULL DEFAULT true,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "acquiredAt" TEXT NOT NULL,
    "marketPrice" REAL NOT NULL,
    "population" INTEGER,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "set" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "image" TEXT NOT NULL,
    "stock" INTEGER NOT NULL,
    "rating" REAL NOT NULL,
    "availability" TEXT NOT NULL,
    "description" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "trending" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Pack" (
    "slug" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "cardsPerPack" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "availability" TEXT NOT NULL,
    "oddsCommon" REAL NOT NULL,
    "oddsUncommon" REAL NOT NULL,
    "oddsRare" REAL NOT NULL,
    "oddsUltra" REAL NOT NULL,
    "oddsSecret" REAL NOT NULL,
    "contents" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Set" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "releaseYear" INTEGER NOT NULL,
    "totalCards" INTEGER NOT NULL,
    "collected" INTEGER NOT NULL,
    "image" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "total" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "estimatedDelivery" TEXT,
    "deliveredDate" TEXT,
    "address" TEXT NOT NULL,
    "items" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "image" TEXT,
    "date" TEXT NOT NULL,
    "xp" INTEGER
);

-- CreateTable
CREATE TABLE "RewardTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "xp" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rank" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "packs" INTEGER NOT NULL,
    "avatarColor" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "WayToWin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "current" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "estimatedDelivery" TEXT NOT NULL,
    "deliveredDate" TEXT,
    "progress" INTEGER NOT NULL,
    "items" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "LatestPull" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "delta" REAL NOT NULL,
    "grader" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Card_set_idx" ON "Card"("set");

-- CreateIndex
CREATE INDEX "Card_rarity_idx" ON "Card"("rarity");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Set_name_idx" ON "Set"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE INDEX "Order_number_idx" ON "Order"("number");
