-- CreateTable
CREATE TABLE "shipment_operations" (
    "id" SERIAL NOT NULL,
    "operationDate" TIMESTAMP(3) NOT NULL,
    "loadingDate" TIMESTAMP(3) NOT NULL,
    "jobId" TEXT,
    "clientName" TEXT NOT NULL,
    "product" TEXT,
    "quantity" TEXT,
    "numberOfContainers" TEXT,
    "containerNumber" TEXT,
    "responsiblePerson" TEXT,
    "qualityRepresentative" TEXT,
    "notes" TEXT,
    "attachments" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_operations_pkey" PRIMARY KEY ("id")
);
