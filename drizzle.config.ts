import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const isSqlite = url.startsWith('file:') || url.startsWith('sqlite:');
const dialect = isSqlite ? 'sqlite' : 'postgresql';

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect,
  dbCredentials: {
    url,
  },
});
