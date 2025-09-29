ALTER TABLE "public"."Setting" DROP COLUMN "value";
ALTER TABLE "public"."Setting" RENAME COLUMN "value_json" TO "value";
ALTER TABLE "public"."Setting" ALTER COLUMN "value" SET NOT NULL;
