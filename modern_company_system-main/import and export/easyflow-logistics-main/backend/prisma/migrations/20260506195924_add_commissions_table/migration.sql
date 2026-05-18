-- CreateTable
CREATE TABLE "Commission" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clientName" TEXT NOT NULL,
    "numberOfContainers" INTEGER NOT NULL DEFAULT 0,
    "totalQuantityTon" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionPerTon" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "product" TEXT,
    "trader" TEXT,
    "qualityRepresentative" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);
