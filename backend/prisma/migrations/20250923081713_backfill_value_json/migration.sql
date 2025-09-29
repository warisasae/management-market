-- prisma/migrations/<ts>_backfill_value_json/migration.sql

-- ย้ายค่าจาก value (TEXT) → value_json (JSONB)
UPDATE "public"."Setting"
SET "value_json" = CASE
  WHEN "value" IN ('true','false')          THEN to_jsonb(("value" = 'true'))   -- boolean
  WHEN "value" ~ '^-?[0-9]+$'               THEN to_jsonb(("value")::int)       -- int
  WHEN "value" ~ '^-?[0-9]*\\.[0-9]+$'      THEN to_jsonb(("value")::numeric)   -- float
  ELSE to_jsonb("value")                                                         -- string
END
WHERE "value_json" IS NULL;

-- กัน NULL (กำหนดเป็น JSON string ว่าง กรณีสุดวิสัย)
UPDATE "public"."Setting"
SET "value_json" = '""'::jsonb
WHERE "value_json" IS NULL;
