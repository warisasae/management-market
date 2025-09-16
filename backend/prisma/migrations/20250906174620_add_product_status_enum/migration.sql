/*
  Warnings:

  - The `status` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."ProductStatus" AS ENUM ('AVAILABLE', 'OUT_OF_STOCK', 'UNAVAILABLE');

-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "status",
ADD COLUMN     "status" "public"."ProductStatus" NOT NULL DEFAULT 'AVAILABLE';
