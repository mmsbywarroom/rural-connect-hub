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

    // Hot-path indexes (leaderboard, surveys, tasks) — previously only PKs existed.
    const indexes = [
      `CREATE INDEX IF NOT EXISTS mapped_volunteers_added_by_user_id_idx ON mapped_volunteers (added_by_user_id)`,
      `CREATE INDEX IF NOT EXISTS supporters_added_by_user_id_idx ON supporters (added_by_user_id)`,
      `CREATE INDEX IF NOT EXISTS hstc_submissions_app_user_id_idx ON hstc_submissions (app_user_id)`,
      `CREATE INDEX IF NOT EXISTS sdsk_submissions_app_user_id_idx ON sdsk_submissions (app_user_id)`,
      `CREATE INDEX IF NOT EXISTS survey_responses_app_user_id_idx ON survey_responses (app_user_id)`,
      `CREATE INDEX IF NOT EXISTS survey_responses_survey_user_idx ON survey_responses (survey_id, app_user_id)`,
      `CREATE INDEX IF NOT EXISTS survey_questions_survey_id_idx ON survey_questions (survey_id)`,
      `CREATE INDEX IF NOT EXISTS surveys_is_active_idx ON surveys (is_active)`,
      `CREATE INDEX IF NOT EXISTS task_configs_enabled_sort_idx ON task_configs (is_enabled, sort_order)`,
      `CREATE INDEX IF NOT EXISTS task_configs_category_id_idx ON task_configs (category_id)`,
      `CREATE INDEX IF NOT EXISTS task_categories_active_sort_idx ON task_categories (is_active, sort_order)`,
      `CREATE INDEX IF NOT EXISTS csc_reports_app_user_id_idx ON csc_reports (app_user_id)`,
      `CREATE INDEX IF NOT EXISTS task_submissions_app_user_id_idx ON task_submissions (app_user_id)`,
      `CREATE INDEX IF NOT EXISTS task_submissions_task_config_id_idx ON task_submissions (task_config_id)`,
      `CREATE INDEX IF NOT EXISTS mapped_volunteers_mobile_number_idx ON mapped_volunteers (mobile_number)`,
      `CREATE INDEX IF NOT EXISTS nvy_reports_app_user_id_idx ON nvy_reports (app_user_id)`,
      `CREATE INDEX IF NOT EXISTS sunwai_complaints_app_user_id_idx ON sunwai_complaints (app_user_id)`,
      `CREATE INDEX IF NOT EXISTS group_messages_group_id_created_idx ON group_messages (group_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS group_members_app_user_id_idx ON group_members (app_user_id)`,
    ];

    for (const sql of indexes) {
      try {
        await pool.query(sql);
      } catch (err: any) {
        // Table may not exist yet in fresh envs — skip quietly.
        if (err?.code === "42P01") continue;
        console.warn("[schema-patches] index skip:", err?.message || err);
      }
    }

    console.log("[schema-patches] performance indexes OK");
  } catch (error) {
    console.error("[schema-patches] Failed to apply patches:", error);
  } finally {
    await pool.end();
  }
}
