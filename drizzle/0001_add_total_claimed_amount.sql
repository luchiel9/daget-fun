ALTER TABLE "dagets" ADD COLUMN "total_claimed_amount_base_units" bigint DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Backfill: sum all non-released claim amounts per daget.
-- 'released' claims are slots freed after permanent failure — money was never sent,
-- so their amounts correctly re-enter the available pool and must not be counted here.
UPDATE "dagets" SET "total_claimed_amount_base_units" = (
  SELECT COALESCE(SUM(c."amount_base_units"), 0)
  FROM "claims" c
  WHERE c."daget_id" = "dagets"."id"
    AND c."status" NOT IN ('released')
    AND c."amount_base_units" IS NOT NULL
);
