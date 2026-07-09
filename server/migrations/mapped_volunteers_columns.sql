  -- =============================================================================
  -- Mapped Volunteers: missing columns fix
  -- Run in pgAdmin / Neon SQL Editor (safe to run multiple times)
  -- Fixes: "Failed to add volunteer" when columns are missing
  -- =============================================================================

  -- 1) Ensure base table exists (only if you never had this table)
  CREATE TABLE IF NOT EXISTS mapped_volunteers (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    added_by_user_id VARCHAR NOT NULL REFERENCES app_users(id),
    name TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );

  -- 2) Add missing columns (IF NOT EXISTS = safe to re-run)
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS volunteer_photo TEXT;
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS voter_id TEXT;
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS aadhaar_photo TEXT;
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS aadhaar_photo_back TEXT;
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS voter_card_photo TEXT;
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS voter_card_photo_back TEXT;

  -- OCR fields
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS ocr_name TEXT;
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS ocr_aadhaar_number TEXT;
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS ocr_voter_id TEXT;
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS ocr_dob TEXT;
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS ocr_gender TEXT;
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS ocr_address TEXT;

  -- Verification + village
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS selected_village_id VARCHAR;
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS selected_village_name TEXT;
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS voter_mapping_booth_id TEXT;
  ALTER TABLE mapped_volunteers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

  -- 3) Verify: list all columns
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'mapped_volunteers'
  ORDER BY ordinal_position;
