-- Mahila Samman Rashi through Punjab Gov – submissions (run in SQL editor)
CREATE TABLE IF NOT EXISTS mahila_samman_punjab_submissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id VARCHAR NOT NULL REFERENCES app_users(id),
  village_id VARCHAR REFERENCES villages(id),
  village_name TEXT,
  name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  mobile_verified BOOLEAN DEFAULT false,
  father_husband_name TEXT,
  aadhaar_front TEXT,
  aadhaar_back TEXT,
  ocr_aadhaar_name TEXT,
  ocr_aadhaar_number TEXT,
  ocr_aadhaar_dob TEXT,
  ocr_aadhaar_gender TEXT,
  ocr_aadhaar_address TEXT,
  aadhaar_verified_same_as_voter BOOLEAN DEFAULT false,
  ocr_voter_id TEXT,
  ocr_voter_name TEXT,
  voter_mapping_booth_id TEXT,
  voter_mapping_name TEXT,
  voter_mapping_father_name TEXT,
  voter_mapping_village_name TEXT,
  manual_booth_id TEXT,
  category TEXT,
  sakhi_photo TEXT,
  declaration_checked BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' NOT NULL,
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add columns (safe re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mahila_samman_punjab_submissions' AND column_name = 'qualification'
  ) THEN
    ALTER TABLE mahila_samman_punjab_submissions ADD COLUMN qualification TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mahila_samman_punjab_submissions' AND column_name = 'bank_account_number'
  ) THEN
    ALTER TABLE mahila_samman_punjab_submissions ADD COLUMN bank_account_number TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mahila_samman_punjab_submissions' AND column_name = 'bank_name'
  ) THEN
    ALTER TABLE mahila_samman_punjab_submissions ADD COLUMN bank_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mahila_samman_punjab_submissions' AND column_name = 'bank_ifsc_code'
  ) THEN
    ALTER TABLE mahila_samman_punjab_submissions ADD COLUMN bank_ifsc_code TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mahila_samman_punjab_submissions' AND column_name = 'bank_document'
  ) THEN
    ALTER TABLE mahila_samman_punjab_submissions ADD COLUMN bank_document TEXT;
  END IF;
END $$;
