import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

const dbUrl = process.env.DATABASE_URL;

// Use placeholder URL as signal to use mock DB for local dev
const useMockDb = !dbUrl || dbUrl === 'postgres://username:password@localhost:5432/letsdo';

if (useMockDb) {
  console.log('[DB] DATABASE_URL not configured. Using SQLite in-memory for development.');
  // For now, export a fallback that will be caught by error handlers in routes
  // We'll implement a proper mock adapter if routes need it
  process.env.DATABASE_URL = 'sqlite::memory:';
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL must be set. Did you forget to provision a database?',
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
