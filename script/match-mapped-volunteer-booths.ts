/**
 * One-off: match mapped_volunteers booth IDs from voter_mapping_master.
 * Usage: npx tsx script/match-mapped-volunteer-booths.ts
 */
import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await pool.query(`ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS voter_mapping_booth_id TEXT`);

  const update = await pool.query(`
    UPDATE mapped_volunteers mv
    SET voter_mapping_booth_id = sub.booth_id
    FROM (
      SELECT DISTINCT ON (LOWER(TRIM(voter_id)))
        LOWER(TRIM(voter_id)) AS vid_key,
        booth_id
      FROM voter_mapping_master
      WHERE voter_id IS NOT NULL AND TRIM(voter_id) <> ''
        AND booth_id IS NOT NULL AND TRIM(booth_id) <> ''
      ORDER BY LOWER(TRIM(voter_id)), created_at
    ) sub
    WHERE LOWER(TRIM(COALESCE(NULLIF(TRIM(mv.voter_id), ''), NULLIF(TRIM(mv.ocr_voter_id), '')))) = sub.vid_key
  `);
  console.log("Updated rows:", update.rowCount);

  const [summary] = (await pool.query(`
    SELECT
      COUNT(*)::int AS total_volunteers,
      COUNT(*) FILTER (WHERE TRIM(COALESCE(voter_id, '')) = '')::int AS missing_voter_id,
      COUNT(*) FILTER (WHERE TRIM(COALESCE(ocr_voter_id, '')) = '')::int AS missing_ocr_voter_id,
      COUNT(*) FILTER (
        WHERE TRIM(COALESCE(voter_id, '')) = '' AND TRIM(COALESCE(ocr_voter_id, '')) = ''
      )::int AS missing_both_ids,
      COUNT(*) FILTER (WHERE voter_mapping_booth_id IS NOT NULL AND TRIM(voter_mapping_booth_id) <> '')::int AS matched_with_booth,
      COUNT(*) FILTER (
        WHERE TRIM(COALESCE(NULLIF(TRIM(voter_id), ''), NULLIF(TRIM(ocr_voter_id), ''))) <> ''
          AND (voter_mapping_booth_id IS NULL OR TRIM(voter_mapping_booth_id) = '')
      )::int AS unmatched_no_booth
    FROM mapped_volunteers
  `)).rows;

  const boothCounts = (await pool.query(`
    SELECT voter_mapping_booth_id AS booth_id, COUNT(*)::int AS volunteer_count
    FROM mapped_volunteers
    WHERE voter_mapping_booth_id IS NOT NULL AND TRIM(voter_mapping_booth_id) <> ''
    GROUP BY voter_mapping_booth_id
    ORDER BY volunteer_count DESC, booth_id
  `)).rows;

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log("\n=== BOOTH COUNTS (top 20) ===");
  console.table(boothCounts.slice(0, 20));
  console.log(`\nTotal distinct booths with volunteers: ${boothCounts.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
