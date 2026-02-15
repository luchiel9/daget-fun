DO $$ BEGIN
 CREATE TYPE "public"."claim_status" AS ENUM('created', 'submitted', 'confirmed', 'failed_retryable', 'failed_permanent', 'released');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."daget_status" AS ENUM('active', 'stopped', 'closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."daget_type" AS ENUM('fixed', 'random');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."notification_type" AS ENUM('claim_confirmed', 'claim_failed', 'claim_released', 'daget_stopped', 'daget_closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claim_retry_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"result" text NOT NULL,
	"ip" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daget_id" uuid NOT NULL,
	"claimant_user_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"receiving_address" text NOT NULL,
	"amount_base_units" bigint,
	"status" "claim_status" DEFAULT 'created' NOT NULL,
	"tx_signature" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_retry_at" timestamp with time zone,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	CONSTRAINT "amount_base_units_safe_int" CHECK (amount_base_units IS NULL OR amount_base_units <= 9007199254740991)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daget_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daget_id" uuid NOT NULL,
	"discord_guild_id" text NOT NULL,
	"discord_role_id" text NOT NULL,
	"discord_role_name_snapshot" text,
	"discord_role_color" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dagets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_slug" text NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"creator_wallet_id" uuid NOT NULL,
	"name" text NOT NULL,
	"message_html" text,
	"token_symbol" text NOT NULL,
	"token_mint" text NOT NULL,
	"discord_guild_name" text,
	"discord_guild_icon" text,
	"token_decimals" integer NOT NULL,
	"total_amount_base_units" bigint NOT NULL,
	"total_winners" integer NOT NULL,
	"daget_type" "daget_type" NOT NULL,
	"random_min_bps" integer,
	"random_max_bps" integer,
	"status" "daget_status" DEFAULT 'active' NOT NULL,
	"claimed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stopped_at" timestamp with time zone,
	CONSTRAINT "dagets_claim_slug_unique" UNIQUE("claim_slug"),
	CONSTRAINT "token_symbol_check" CHECK (token_symbol IN ('USDC', 'USDT')),
	CONSTRAINT "total_amount_positive" CHECK (total_amount_base_units > 0),
	CONSTRAINT "total_amount_safe_int" CHECK (total_amount_base_units <= 9007199254740991),
	CONSTRAINT "total_winners_positive" CHECK (total_winners > 0),
	CONSTRAINT "claimed_count_range" CHECK (claimed_count >= 0 AND claimed_count <= total_winners),
	CONSTRAINT "random_mode_check" CHECK (
    (daget_type = 'fixed' AND random_min_bps IS NULL AND random_max_bps IS NULL)
    OR
    (daget_type = 'random'
      AND random_min_bps IS NOT NULL
      AND random_max_bps IS NOT NULL
      AND random_min_bps > 0
      AND random_max_bps >= random_min_bps
      AND random_max_bps <= 10000)
  )
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "export_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"token" text NOT NULL,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "export_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"request_body_hash" text NOT NULL,
	"response_status" integer NOT NULL,
	"response_body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"related_daget_id" uuid,
	"related_claim_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_user_id" text NOT NULL,
	"discord_username" text,
	"discord_avatar_url" text,
	"receiving_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_discord_user_id_unique" UNIQUE("discord_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallet_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"request_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"result" text DEFAULT 'success' NOT NULL,
	"failure_reason" text,
	"exported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retention_until" timestamp with time zone,
	"ip" "inet",
	"user_agent" text,
	CONSTRAINT "result_check" CHECK (result IN ('success', 'denied', 'failed'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"public_key" text NOT NULL,
	"encrypted_private_key" text,
	"encryption_scheme" text NOT NULL,
	"encryption_key_ref" text,
	"encryption_version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rotated_at" timestamp with time zone,
	"key_forgotten_at" timestamp with time zone,
	"last_exported_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claim_retry_audit" ADD CONSTRAINT "claim_retry_audit_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claim_retry_audit" ADD CONSTRAINT "claim_retry_audit_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_daget_id_dagets_id_fk" FOREIGN KEY ("daget_id") REFERENCES "public"."dagets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_claimant_user_id_users_id_fk" FOREIGN KEY ("claimant_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daget_requirements" ADD CONSTRAINT "daget_requirements_daget_id_dagets_id_fk" FOREIGN KEY ("daget_id") REFERENCES "public"."dagets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dagets" ADD CONSTRAINT "dagets_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dagets" ADD CONSTRAINT "dagets_creator_wallet_id_wallets_id_fk" FOREIGN KEY ("creator_wallet_id") REFERENCES "public"."wallets"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "export_tokens" ADD CONSTRAINT "export_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "export_tokens" ADD CONSTRAINT "export_tokens_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_daget_id_dagets_id_fk" FOREIGN KEY ("related_daget_id") REFERENCES "public"."dagets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_claim_id_claims_id_fk" FOREIGN KEY ("related_claim_id") REFERENCES "public"."claims"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallet_exports" ADD CONSTRAINT "wallet_exports_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallet_exports" ADD CONSTRAINT "wallet_exports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "claims_one_per_user_per_daget" ON "claims" USING btree ("daget_id","claimant_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "claims_tx_signature_unique" ON "claims" USING btree ("tx_signature") WHERE tx_signature IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_daget_id_status_idx" ON "claims" USING btree ("daget_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_claimant_user_id_idx" ON "claims" USING btree ("claimant_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_next_retry_at_idx" ON "claims" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_locked_until_idx" ON "claims" USING btree ("locked_until");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daget_requirements_daget_id_idx" ON "daget_requirements" USING btree ("daget_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dagets_creator_user_id_idx" ON "dagets" USING btree ("creator_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dagets_one_active_per_creator" ON "dagets" USING btree ("creator_user_id") WHERE status = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_unique" ON "idempotency_keys" USING btree ("key","user_id","endpoint");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "notifications" USING btree ("user_id") WHERE is_read = false;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallet_exports_wallet_id_idx" ON "wallet_exports" USING btree ("wallet_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_one_active_per_user" ON "wallets" USING btree ("user_id") WHERE is_active = true;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_public_key_unique" ON "wallets" USING btree ("public_key");