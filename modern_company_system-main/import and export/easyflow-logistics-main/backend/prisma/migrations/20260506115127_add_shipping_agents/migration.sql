/*
  Warnings:

  - You are about to drop the column `supplierDiscountPercentage` on the `Job` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Supplier` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Client` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Supplier` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ContainerProduct" DROP CONSTRAINT "ContainerProduct_productId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "JobProduct" DROP CONSTRAINT "JobProduct_productId_fkey";

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "supplierDiscountPercentage";

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "ShippingAgent" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "telephone" TEXT,
    "personalNumber" TEXT,
    "email" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingAgentRecord" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "blNumber" TEXT,
    "country" TEXT,
    "containerCount" INTEGER NOT NULL DEFAULT 0,
    "costEgp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costEgpNote" TEXT,
    "costEuro" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costEuroNote" TEXT,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costUsdNote" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentId" INTEGER NOT NULL,
    "jobId" INTEGER,

    CONSTRAINT "ShippingAgentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShippingAgent_email_key" ON "ShippingAgent"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Container_containerNumber_idx" ON "Container"("containerNumber");

-- CreateIndex
CREATE INDEX "ContainerProduct_containerId_idx" ON "ContainerProduct"("containerId");

-- CreateIndex
CREATE INDEX "ContainerProduct_productId_idx" ON "ContainerProduct"("productId");

-- CreateIndex
CREATE INDEX "Job_jobNumber_idx" ON "Job"("jobNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_email_key" ON "Supplier"("email");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProduct" ADD CONSTRAINT "JobProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerProduct" ADD CONSTRAINT "ContainerProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingAgentRecord" ADD CONSTRAINT "ShippingAgentRecord_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ShippingAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
