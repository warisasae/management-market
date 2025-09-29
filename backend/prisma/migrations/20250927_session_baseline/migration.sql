-- Baseline for existing "session" table created by the session store.
-- This aligns Prisma migration history with the actual DB.

CREATE TABLE IF NOT EXISTS "public"."session" (
  "sid"    varchar NOT NULL,
  "sess"   json    NOT NULL,
  "expire" timestamp(6) without time zone NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- บางเครื่อง index อาจชื่อ "IDX_session_expire", บางเครื่อง "session_expire_idx"
-- สร้างทั้งสองแบบแบบ IF NOT EXISTS เพื่อครอบคลุม
CREATE INDEX IF NOT EXISTS "IDX_session_expire"  ON "public"."session" ("expire");
CREATE INDEX IF NOT EXISTS "session_expire_idx" ON "public"."session" ("expire");
