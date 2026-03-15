CREATE TABLE "discord_bot_installations" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"installed_by_user" uuid,
	"guild_name" text,
	"guild_icon" text,
	"permissions" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dagets" DROP CONSTRAINT "claimed_count_range";--> statement-breakpoint
ALTER TABLE "dagets" DROP CONSTRAINT "random_mode_check";--> statement-breakpoint
DROP INDEX "dagets_one_active_per_creator";--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "is_raffle_winner" boolean;--> statement-breakpoint
ALTER TABLE "dagets" ADD COLUMN "raffle_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dagets" ADD COLUMN "raffle_drawn_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dagets" ADD COLUMN "discord_channel_id" text;--> statement-breakpoint
ALTER TABLE "dagets" ADD COLUMN "discord_message_id" text;--> statement-breakpoint
ALTER TABLE "dagets" ADD COLUMN "drand_round" bigint;--> statement-breakpoint
ALTER TABLE "dagets" ADD COLUMN "drand_randomness" text;--> statement-breakpoint
ALTER TABLE "dagets" ADD COLUMN "draw_attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "discord_bot_installations" ADD CONSTRAINT "discord_bot_installations_installed_by_user_users_id_fk" FOREIGN KEY ("installed_by_user") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dagets_one_active_instant" ON "dagets" USING btree ("creator_user_id") WHERE status = 'active' AND daget_type != 'raffle';--> statement-breakpoint
CREATE UNIQUE INDEX "dagets_one_active_raffle" ON "dagets" USING btree ("creator_user_id") WHERE status IN ('active', 'drawing') AND daget_type = 'raffle';--> statement-breakpoint
ALTER TABLE "dagets" ADD CONSTRAINT "raffle_ends_at_required" CHECK (daget_type != 'raffle' OR raffle_ends_at IS NOT NULL);--> statement-breakpoint
ALTER TABLE "dagets" ADD CONSTRAINT "raffle_ends_at_forbidden" CHECK (daget_type = 'raffle' OR raffle_ends_at IS NULL);--> statement-breakpoint
ALTER TABLE "dagets" ADD CONSTRAINT "drand_raffle_only" CHECK (daget_type = 'raffle' OR (drand_round IS NULL AND drand_randomness IS NULL));--> statement-breakpoint
ALTER TABLE "dagets" ADD CONSTRAINT "claimed_count_range" CHECK (
    claimed_count >= 0
    AND ((daget_type != 'raffle' AND claimed_count <= total_winners) OR daget_type = 'raffle')
  );--> statement-breakpoint
ALTER TABLE "dagets" ADD CONSTRAINT "random_mode_check" CHECK (
    (daget_type = 'fixed' AND random_min_bps IS NULL AND random_max_bps IS NULL)
    OR
    (daget_type = 'random'
      AND random_min_bps IS NOT NULL
      AND random_max_bps IS NOT NULL
      AND random_min_bps > 0
      AND random_max_bps >= random_min_bps
      AND random_max_bps <= 10000)
    OR
    (daget_type = 'raffle' AND random_min_bps IS NULL AND random_max_bps IS NULL)
  );--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "raffle_winner_has_amount" CHECK (is_raffle_winner IS NOT TRUE OR amount_base_units IS NOT NULL);
