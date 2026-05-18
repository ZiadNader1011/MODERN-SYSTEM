/*
  Warnings:

  - You are about to drop the `PackingList` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PackingList" DROP CONSTRAINT "PackingList_jobId_fkey";

-- DropTable
DROP TABLE "PackingList";

-- CreateTable
CREATE TABLE "packing_lists" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "blNumber" TEXT,
    "clientName" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "customRelease" TEXT,
    "note" TEXT,
    "shippingAgent" TEXT,
    "pol" TEXT,
    "pod" TEXT,
    "finalDestination" TEXT,
    "shippingDate" TIMESTAMP(3),
    "numberOfContainers" INTEGER NOT NULL DEFAULT 0,
    "numberOfProducts" INTEGER NOT NULL DEFAULT 0,
    "containerNumbers" JSONB DEFAULT '[]',
    "products" JSONB DEFAULT '[]',
    "attachments" JSONB DEFAULT '[]',
    "jobId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packing_lists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "packing_lists_jobId_idx" ON "packing_lists"("jobId");

-- AddForeignKey
ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
