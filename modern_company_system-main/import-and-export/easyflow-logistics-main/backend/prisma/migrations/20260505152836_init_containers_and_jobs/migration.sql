/*
  Warnings:

  - The primary key for the `Client` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `address` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `agentName` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `balance` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `company` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `contact` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `dhl` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `fax` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `telephone` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `vat` on the `Client` table. All the data in the column will be lost.
  - The primary key for the `Container` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `arrivalDate` on the `Container` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Container` table. All the data in the column will be lost.
  - You are about to drop the column `destinationPort` on the `Container` table. All the data in the column will be lost.
  - You are about to drop the column `shippingDate` on the `Container` table. All the data in the column will be lost.
  - You are about to drop the column `sourcePort` on the `Container` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Container` table. All the data in the column will be lost.
  - The primary key for the `Job` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `discountPercentage` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `operationType` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `pettyCash` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `rawMaterialPricePerTon` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `rawMaterialWeight` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `supplierDiscountPercentage` on the `Job` table. All the data in the column will be lost.
  - The primary key for the `Product` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Supplier` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `address` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `agentName` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `contact` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `vat` on the `Supplier` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_containerId_fkey";

-- DropForeignKey
ALTER TABLE "ContainerProduct" DROP CONSTRAINT "ContainerProduct_containerId_fkey";

-- DropForeignKey
ALTER TABLE "ContainerProduct" DROP CONSTRAINT "ContainerProduct_productId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "JobProduct" DROP CONSTRAINT "JobProduct_jobId_fkey";

-- DropForeignKey
ALTER TABLE "JobProduct" DROP CONSTRAINT "JobProduct_productId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_supplierId_fkey";

-- AlterTable
ALTER TABLE "Attachment" ALTER COLUMN "containerId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Client" DROP CONSTRAINT "Client_pkey",
DROP COLUMN "address",
DROP COLUMN "agentName",
DROP COLUMN "balance",
DROP COLUMN "company",
DROP COLUMN "contact",
DROP COLUMN "country",
DROP COLUMN "createdAt",
DROP COLUMN "dhl",
DROP COLUMN "email",
DROP COLUMN "fax",
DROP COLUMN "phone",
DROP COLUMN "telephone",
DROP COLUMN "vat",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Client_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Client_id_seq";

-- AlterTable
ALTER TABLE "Container" DROP CONSTRAINT "Container_pkey",
DROP COLUMN "arrivalDate",
DROP COLUMN "createdAt",
DROP COLUMN "destinationPort",
DROP COLUMN "shippingDate",
DROP COLUMN "sourcePort",
DROP COLUMN "status",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Container_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Container_id_seq";

-- AlterTable
ALTER TABLE "ContainerProduct" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'KG',
ALTER COLUMN "containerId" SET DATA TYPE TEXT,
ALTER COLUMN "productId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Job" DROP CONSTRAINT "Job_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "currency",
DROP COLUMN "discountPercentage",
DROP COLUMN "notes",
DROP COLUMN "operationType",
DROP COLUMN "pettyCash",
DROP COLUMN "rawMaterialPricePerTon",
DROP COLUMN "rawMaterialWeight",
DROP COLUMN "status",
DROP COLUMN "supplierDiscountPercentage",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "clientId" SET DATA TYPE TEXT,
ALTER COLUMN "supplierId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Job_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Job_id_seq";

-- AlterTable
ALTER TABLE "JobProduct" ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'KG',
ALTER COLUMN "jobId" SET DATA TYPE TEXT,
ALTER COLUMN "productId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Product" DROP CONSTRAINT "Product_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "supplierId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Product_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Product_id_seq";

-- AlterTable
ALTER TABLE "Supplier" DROP CONSTRAINT "Supplier_pkey",
DROP COLUMN "address",
DROP COLUMN "agentName",
DROP COLUMN "contact",
DROP COLUMN "createdAt",
DROP COLUMN "email",
DROP COLUMN "phone",
DROP COLUMN "vat",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Supplier_id_seq";

-- CreateIndex
CREATE INDEX "Attachment_containerId_idx" ON "Attachment"("containerId");

-- CreateIndex
CREATE INDEX "ContainerProduct_containerId_idx" ON "ContainerProduct"("containerId");

-- CreateIndex
CREATE INDEX "ContainerProduct_productId_idx" ON "ContainerProduct"("productId");

-- CreateIndex
CREATE INDEX "Job_clientId_idx" ON "Job"("clientId");

-- CreateIndex
CREATE INDEX "Job_supplierId_idx" ON "Job"("supplierId");

-- CreateIndex
CREATE INDEX "JobProduct_jobId_idx" ON "JobProduct"("jobId");

-- CreateIndex
CREATE INDEX "JobProduct_productId_idx" ON "JobProduct"("productId");

-- CreateIndex
CREATE INDEX "Product_supplierId_idx" ON "Product"("supplierId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProduct" ADD CONSTRAINT "JobProduct_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProduct" ADD CONSTRAINT "JobProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerProduct" ADD CONSTRAINT "ContainerProduct_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerProduct" ADD CONSTRAINT "ContainerProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container"("id") ON DELETE CASCADE ON UPDATE CASCADE;
