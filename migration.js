const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');

async function runMigrate() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is not defined');
    }

    const migrationClient = postgres(connectionString, { max: 1 });
    const db = drizzle(migrationClient);

    console.log('Running migrations...');
    try {
        await migrate(db, { migrationsFolder: './drizzle' });
        console.log('Migrations completed successfully.');
        await migrationClient.end();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigrate();
