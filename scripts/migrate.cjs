/**
 * Standalone DB migration script for Docker/production.
 * Run before starting the Next server so migrations apply even when
 * instrumentation.ts register() is not invoked at startup (e.g. standalone mode).
 */
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

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
