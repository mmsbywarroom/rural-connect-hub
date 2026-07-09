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
    const mappedVolunteerTextColumns = [
      "volunteer_photo",
      "voter_id",
      "aadhaar_photo",
      "aadhaar_photo_back",
      "voter_card_photo",
      "voter_card_photo_back",
      "ocr_name",
      "ocr_aadhaar_number",
      "ocr_voter_id",
      "ocr_dob",
      "ocr_gender",
      "ocr_address",
      "selected_village_id",
      "selected_village_name",
      "voter_mapping_booth_id",
    ];

    for (const column of mappedVolunteerTextColumns) {
      await pool.query(
        `ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS ${column} text;`,
      );
    }

    await pool.query(`
      ALTER TABLE mapped_volunteers
      ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
    `);

    console.log("[schema-patches] mapped_volunteers columns OK");
  } catch (error) {
    console.error("[schema-patches] Failed to apply patches:", error);
  } finally {
    await pool.end();
  }
}
