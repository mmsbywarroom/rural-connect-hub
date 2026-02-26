import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  console.error(
    "[Drizzle] DATABASE_URL is not defined. Please set it in your .env file (Supabase connection string).",
  );
  throw new Error("DATABASE_URL environment variable is required for Drizzle");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
