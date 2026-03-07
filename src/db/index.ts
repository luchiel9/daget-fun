import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as relations from './relations';

const connectionString = process.env.DATABASE_URL!;

// Singleton pattern for connection reuse in serverless
const globalForDb = globalThis as unknown as {
    connection: ReturnType<typeof postgres> | undefined;
};

const poolMax = parseInt(process.env.POSTGRES_POOL_MAX || '10', 10);

const connection = globalForDb.connection ?? postgres(connectionString, {
    max: poolMax,
    idle_timeout: 20,
    connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') {
    globalForDb.connection = connection;
}

export const db = drizzle(connection, { schema: { ...schema, ...relations } });
export type Database = typeof db;
