-- AlterTable: Add credits to User
ALTER TABLE "User" ADD COLUMN "credits" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Add credit tracking to Photo
ALTER TABLE "Photo" ADD COLUMN "creditDeducted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Photo" ADD COLUMN "creditRefunded" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'DEDUCTION', 'REFUND', 'ADMIN_GRANT');

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "photoId" TEXT,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_idx" ON "CreditTransaction"("userId");

-- CreateIndex
CREATE INDEX "CreditTransaction_createdAt_idx" ON "CreditTransaction"("createdAt");

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
