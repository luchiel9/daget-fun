ALTER TYPE "public"."daget_status" ADD VALUE IF NOT EXISTS 'drawing';--> statement-breakpoint
ALTER TYPE "public"."daget_type" ADD VALUE IF NOT EXISTS 'raffle';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'raffle_won';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'raffle_lost';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'raffle_drawn';
