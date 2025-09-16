/*
  Warnings:

  - You are about to drop the column `sale_date` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `total_amount` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `SaleItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Sale" DROP CONSTRAINT "Sale_user_id_fkey";

-- AlterTable
ALTER TABLE "public"."Sale" DROP COLUMN "sale_date",
DROP COLUMN "total_amount",
ADD COLUMN     "cash_received" DOUBLE PRECISION,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "grand_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "payment_method" TEXT NOT NULL DEFAULT 'เงินสด',
ADD COLUMN     "sub_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "vat_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "vat_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."SaleItem" DROP COLUMN "subtotal",
ADD COLUMN     "total" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
