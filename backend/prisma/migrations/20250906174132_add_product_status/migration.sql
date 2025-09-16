-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
ALTER COLUMN "stock_qty" SET DEFAULT 0;
