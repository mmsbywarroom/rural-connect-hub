import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "[Database] DATABASE_URL is not defined. Please set it in your .env file (Supabase connection string).",
  );
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });