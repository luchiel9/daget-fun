DO $$ BEGIN
 ALTER TABLE "users" ADD COLUMN "finished_guide" boolean DEFAULT false NOT NULL;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
