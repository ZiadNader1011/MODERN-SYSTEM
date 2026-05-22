/*
  Warnings:

  - You are about to drop the column `agentName` on the `Supplier` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_supplierId_fkey";

-- DropIndex
DROP INDEX "transactions_relatedId_idx";

-- AlterTable
ALTER TABLE "ContainerProduct" ADD COLUMN     "grossWeight" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "netWeight" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "packageType" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "numberOfSuppliers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supplierIds" INTEGER[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "price" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Supplier" DROP COLUMN "agentName",
ADD COLUMN     "product" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "clientId" INTEGER,
ADD COLUMN     "jobId" INTEGER,
ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "transactions_clientId_idx" ON "transactions"("clientId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
