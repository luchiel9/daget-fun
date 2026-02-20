ALTER TABLE "dagets" DROP CONSTRAINT IF EXISTS "token_symbol_check";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "finished_guide" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "dagets" ADD CONSTRAINT "token_symbol_check" CHECK (token_symbol IN ('USDC', 'USDT', 'SOL'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
