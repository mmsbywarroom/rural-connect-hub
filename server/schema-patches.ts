import pg from "pg";

/** Lightweight idempotent schema patches applied on server startup. */
export async function applySchemaPatches() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query(`
      ALTER TABLE mapped_volunteers
      ADD COLUMN IF NOT EXISTS volunteer_photo text;
    `);
    console.log("[schema-patches] mapped_volunteers.volunteer_photo OK");
  } catch (error) {
    console.error("[schema-patches] Failed to apply patches:", error);
  } finally {
    await pool.end();
  }
}
