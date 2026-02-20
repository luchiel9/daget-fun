-- Allow SOL as a token option for Dagets (idempotent)
DO $$
BEGIN
  ALTER TABLE "dagets" DROP CONSTRAINT IF EXISTS "token_symbol_check";
  ALTER TABLE "dagets" ADD CONSTRAINT "token_symbol_check" CHECK (token_symbol IN ('USDC', 'USDT', 'SOL'));
EXCEPTION
  WHEN duplicate_object THEN NULL; -- constraint already exists
END $$;
