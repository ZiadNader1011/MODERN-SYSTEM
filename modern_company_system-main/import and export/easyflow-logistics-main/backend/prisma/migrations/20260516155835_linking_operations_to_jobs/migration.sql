-- AlterTable
ALTER TABLE "shipment_operations" ADD COLUMN     "jobDate" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "shipment_operations" ADD CONSTRAINT "shipment_operations_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
