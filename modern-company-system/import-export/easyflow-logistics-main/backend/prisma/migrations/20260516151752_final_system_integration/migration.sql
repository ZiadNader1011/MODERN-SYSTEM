/*
  Warnings:

  - The `jobId` column on the `ArchiveFile` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[bankName,currency]` on the table `BankBalance` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "BankBalance_bankName_key";

-- AlterTable
ALTER TABLE "ArchiveFile" DROP COLUMN "jobId",
ADD COLUMN     "jobId" INTEGER;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "supplierId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "BankBalance_bankName_currency_key" ON "BankBalance"("bankName", "currency");

-- CreateIndex
CREATE INDEX "transactions_supplierId_idx" ON "transactions"("supplierId");

-- CreateIndex
CREATE INDEX "transactions_jobId_idx" ON "transactions"("jobId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
