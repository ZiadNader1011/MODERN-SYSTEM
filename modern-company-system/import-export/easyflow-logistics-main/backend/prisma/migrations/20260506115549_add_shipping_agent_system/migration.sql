-- AlterTable
ALTER TABLE "ShippingAgentRecord" ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "ShippingAgentRecord_agentId_idx" ON "ShippingAgentRecord"("agentId");

-- CreateIndex
CREATE INDEX "ShippingAgentRecord_jobId_idx" ON "ShippingAgentRecord"("jobId");

-- AddForeignKey
ALTER TABLE "ShippingAgentRecord" ADD CONSTRAINT "ShippingAgentRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
