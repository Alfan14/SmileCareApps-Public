/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `AiUsage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AiUsage" DROP COLUMN "updatedAt",
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "costMicros" SET DEFAULT 0;
