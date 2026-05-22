-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "attachments" JSONB;

-- CreateTable
CREATE TABLE "PackingList" (
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
    "containerNumbers" JSONB,
    "products" JSONB,
    "attachments" JSONB,
    "jobId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackingList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PackingList_jobId_idx" ON "PackingList"("jobId");

-- AddForeignKey
ALTER TABLE "PackingList" ADD CONSTRAINT "PackingList_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
