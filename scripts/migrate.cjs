/**
 * Standalone DB migration script for Docker/production.
 * Run before starting the Next server so migrations apply even when
 * instrumentation.ts register() is not invoked at startup (e.g. standalone mode).
 */
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

/**
 * PostgreSQL forbids using a newly-added enum value inside the same
 * transaction that added it ("unsafe use of new value").  drizzle-orm's
 * migrate() wraps all pending migrations in one transaction, so an
 * ADD VALUE in migration N and a CHECK / index referencing it in
 * migration N+1 will collide.
 *
 * Fix: pre-commit every ADD VALUE IF NOT EXISTS *outside* a transaction
 * before handing off to drizzle. The IF NOT EXISTS clause makes this
 * idempotent — safe to re-run on every startup.
 */
const ENUM_VALUES = [
  { type: 'daget_status', value: 'drawing' },
  { type: 'daget_type',   value: 'raffle'  },
  { type: 'notification_type', value: 'raffle_won'  },
  { type: 'notification_type', value: 'raffle_lost' },
  { type: 'notification_type', value: 'raffle_drawn' },
];

async function preCommitEnumValues(url) {
  // Use a separate, non-transactional connection
  const sql = postgres(url, { max: 1 });
  for (const { type, value } of ENUM_VALUES) {
    try {
      await sql.unsafe(
        `ALTER TYPE "public"."${type}" ADD VALUE IF NOT EXISTS '${value}'`
      );
    } catch (err) {
      // 42710 = duplicate_object — value already exists (PG < 9.3 compat)
      if (err.code !== '42710') throw err;
    }
  }
  await sql.end();
}

async function main() {
  if (process.env.AUTO_MIGRATE_ON_STARTUP !== 'true') {
    console.log('Skipping migrations (AUTO_MIGRATE_ON_STARTUP != true)');
    process.exit(0);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required for migrations');
    process.exit(1);
  }
  console.log('⏳ Running database migrations...');
  await preCommitEnumValues(url);
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: './drizzle' });
  await client.end();
  console.log('✅ Database migrations completed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Database migration failed:', err);
  process.exit(1);
});
