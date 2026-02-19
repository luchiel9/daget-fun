export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.AUTO_MIGRATE_ON_STARTUP === 'true') {
    try {
      console.log('⏳ Starting database migrations...');
      const { migrate } = await import('drizzle-orm/postgres-js/migrator');
      const { db } = await import('@/db');

      // In standalone output, CWD is /app, and we copied 'drizzle' folder there.
      await migrate(db, { migrationsFolder: './drizzle' });
      console.log('✅ Database migrations completed successfully.');
    } catch (error) {
      console.error('❌ Database migration failed:', error);
      // Exit functionality to prevent running with invalid schema
      process.exit(1);
    }
  }
}
