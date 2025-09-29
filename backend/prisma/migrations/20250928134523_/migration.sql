/*
  Warnings:

  - The primary key for the `session` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropIndex
DROP INDEX "public"."IDX_session_expire";

-- DropIndex
DROP INDEX "public"."session_expire_idx";

-- AlterTable
ALTER TABLE "public"."Sale" ADD COLUMN     "refunded_at" TIMESTAMP(3),
ADD COLUMN     "refunded_by" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PAID',
ADD COLUMN     "voided_at" TIMESTAMP(3),
ADD COLUMN     "voided_by" TEXT;

-- AlterTable
ALTER TABLE "public"."session" DROP CONSTRAINT "session_pkey",
ALTER COLUMN "sid" SET DATA TYPE TEXT,
ALTER COLUMN "sess" SET DATA TYPE JSONB,
ALTER COLUMN "expire" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
