/*
  Warnings:

  - The `jobId` column on the `shipment_operations` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "shipment_operations" DROP COLUMN "jobId",
ADD COLUMN     "jobId" INTEGER;
