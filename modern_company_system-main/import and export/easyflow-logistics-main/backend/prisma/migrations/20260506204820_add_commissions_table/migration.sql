-- CreateTable
CREATE TABLE "commissions" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientName" TEXT NOT NULL,
    "trader" TEXT DEFAULT '',
    "product" TEXT DEFAULT '',
    "qualityRepresentative" TEXT DEFAULT '',
    "numberOfContainers" INTEGER NOT NULL DEFAULT 0,
    "totalQuantityTon" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionPerTon" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "attachments" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);
