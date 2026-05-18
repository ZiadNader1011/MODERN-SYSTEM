/*
  Warnings:

  - The primary key for the `Client` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Client` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Container` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Container` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `createdAt` on the `ContainerProduct` table. All the data in the column will be lost.
  - You are about to drop the column `grossWeight` on the `ContainerProduct` table. All the data in the column will be lost.
  - You are about to drop the column `netWeight` on the `ContainerProduct` table. All the data in the column will be lost.
  - You are about to drop the column `packageType` on the `ContainerProduct` table. All the data in the column will be lost.
  - You are about to drop the column `packages` on the `ContainerProduct` table. All the data in the column will be lost.
  - The primary key for the `Job` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Job` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `clientId` column on the `Job` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `supplierId` column on the `Job` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `unit` on the `JobProduct` table. All the data in the column will be lost.
  - The primary key for the `Product` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `supplierId` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Supplier` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Supplier` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `containerId` on the `Attachment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `containerId` on the `ContainerProduct` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `productId` on the `ContainerProduct` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `jobId` on the `JobProduct` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `productId` on the `JobProduct` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

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

-- DropIndex
DROP INDEX "ContainerProduct_containerId_idx";

-- DropIndex
DROP INDEX "ContainerProduct_productId_idx";

-- AlterTable
ALTER TABLE "Attachment" DROP COLUMN "containerId",
ADD COLUMN     "containerId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Client" DROP CONSTRAINT "Client_pkey",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "agentName" TEXT,
ADD COLUMN     "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "contact" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dhl" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "fax" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "telephone" TEXT,
ADD COLUMN     "vat" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Client_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Container" DROP CONSTRAINT "Container_pkey",
ADD COLUMN     "arrivalDate" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "destinationPort" TEXT,
ADD COLUMN     "shippingDate" TIMESTAMP(3),
ADD COLUMN     "sourcePort" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'loading',
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Container_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ContainerProduct" DROP COLUMN "createdAt",
DROP COLUMN "grossWeight",
DROP COLUMN "netWeight",
DROP COLUMN "packageType",
DROP COLUMN "packages",
DROP COLUMN "containerId",
ADD COLUMN     "containerId" INTEGER NOT NULL,
DROP COLUMN "productId",
ADD COLUMN     "productId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Job" DROP CONSTRAINT "Job_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "operationType" TEXT NOT NULL DEFAULT 'export',
ADD COLUMN     "pettyCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "rawMaterialPricePerTon" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "rawMaterialWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "supplierDiscountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "clientId",
ADD COLUMN     "clientId" INTEGER,
DROP COLUMN "supplierId",
ADD COLUMN     "supplierId" INTEGER,
ADD CONSTRAINT "Job_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "JobProduct" DROP COLUMN "unit",
DROP COLUMN "jobId",
ADD COLUMN     "jobId" INTEGER NOT NULL,
DROP COLUMN "productId",
ADD COLUMN     "productId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP CONSTRAINT "Product_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "supplierId",
ADD COLUMN     "supplierId" INTEGER,
ADD CONSTRAINT "Product_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Supplier" DROP CONSTRAINT "Supplier_pkey",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "agentName" TEXT,
ADD COLUMN     "contact" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "vat" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "Attachment_containerId_idx" ON "Attachment"("containerId");

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
