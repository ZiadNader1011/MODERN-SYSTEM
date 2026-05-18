-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "relatedType" TEXT,
ALTER COLUMN "relatedId" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "transactions_relatedId_idx" ON "transactions"("relatedId");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");
