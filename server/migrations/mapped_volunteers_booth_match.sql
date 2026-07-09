-- =============================================================================
-- Mapped Volunteers: match Booth ID from voter_mapping_master
-- Run in pgAdmin / Neon SQL Editor (safe to re-run)
--
-- Logic: use voter_id if present, else ocr_voter_id; match voter_mapping_master.voter_id
-- =============================================================================

ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS voter_mapping_booth_id TEXT;

-- Set booth from voter mapping sheet (one booth per voter ID)
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
WHERE LOWER(TRIM(COALESCE(NULLIF(TRIM(mv.voter_id), ''), NULLIF(TRIM(mv.ocr_voter_id), '')))) = sub.vid_key;

-- Clear booth where no effective voter ID
UPDATE mapped_volunteers
SET voter_mapping_booth_id = NULL
WHERE TRIM(COALESCE(voter_id, '')) = ''
  AND TRIM(COALESCE(ocr_voter_id, '')) = '';

-- -----------------------------------------------------------------------------
-- Summary report
-- -----------------------------------------------------------------------------

-- Overall counts
SELECT
  COUNT(*)::int AS total_volunteers,
  COUNT(*) FILTER (WHERE TRIM(COALESCE(voter_id, '')) = '')::int AS missing_voter_id,
  COUNT(*) FILTER (WHERE TRIM(COALESCE(ocr_voter_id, '')) = '')::int AS missing_ocr_voter_id,
  COUNT(*) FILTER (
    WHERE TRIM(COALESCE(voter_id, '')) = '' AND TRIM(COALESCE(ocr_voter_id, '')) = ''
  )::int AS missing_both_ids,
  COUNT(*) FILTER (
    WHERE TRIM(COALESCE(NULLIF(TRIM(voter_id), ''), NULLIF(TRIM(ocr_voter_id), ''))) <> ''
  )::int AS has_effective_voter_id,
  COUNT(*) FILTER (WHERE voter_mapping_booth_id IS NOT NULL AND TRIM(voter_mapping_booth_id) <> '')::int AS matched_with_booth,
  COUNT(*) FILTER (
    WHERE TRIM(COALESCE(NULLIF(TRIM(voter_id), ''), NULLIF(TRIM(ocr_voter_id), ''))) <> ''
      AND (voter_mapping_booth_id IS NULL OR TRIM(voter_mapping_booth_id) = '')
  )::int AS unmatched_no_booth
FROM mapped_volunteers;

-- Volunteers per booth (matched only)
SELECT
  voter_mapping_booth_id AS booth_id,
  COUNT(*)::int AS volunteer_count
FROM mapped_volunteers
WHERE voter_mapping_booth_id IS NOT NULL AND TRIM(voter_mapping_booth_id) <> ''
GROUP BY voter_mapping_booth_id
ORDER BY volunteer_count DESC, booth_id;

-- Unmatched volunteers (have ID but no booth in voter mapping sheet)
SELECT id, name, mobile_number, voter_id, ocr_voter_id,
  COALESCE(NULLIF(TRIM(voter_id), ''), NULLIF(TRIM(ocr_voter_id), '')) AS effective_voter_id
FROM mapped_volunteers
WHERE TRIM(COALESCE(NULLIF(TRIM(voter_id), ''), NULLIF(TRIM(ocr_voter_id), ''))) <> ''
  AND (voter_mapping_booth_id IS NULL OR TRIM(voter_mapping_booth_id) = '')
ORDER BY name;
