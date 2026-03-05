-- Voter Registration Submissions table
-- Run this in your SQL editor (e.g. Supabase / Neon)

CREATE TABLE IF NOT EXISTS voter_registration_submissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id VARCHAR NOT NULL REFERENCES app_users(id),
  serial_number INTEGER,
  -- Personal
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  place_of_birth TEXT,
  relative_name TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  -- Address
  house_number TEXT,
  street_mohalla_village TEXT,
  post_office TEXT,
  district TEXT,
  state TEXT DEFAULT 'Punjab',
  pin_code TEXT,
  -- Assembly
  assembly_constituency TEXT,
  -- Aadhaar / Contact
  aadhaar_number TEXT,
  mobile_number TEXT,
  email TEXT,
  mobile_verified BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  -- Disability
  disability TEXT DEFAULT 'None',
  -- Documents
  age_proof_type TEXT,
  age_proof_image TEXT,
  age_proof_ocr_data TEXT,
  address_proof_type TEXT,
  address_proof_image TEXT,
  address_proof_ocr_data TEXT,
  photograph TEXT,
  photograph_ocr_data TEXT,
  status TEXT DEFAULT 'pending',
  review_note TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP,
  card_pdf TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Optional: index for listing by date and by user
CREATE INDEX IF NOT EXISTS idx_voter_reg_created_at ON voter_registration_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voter_reg_app_user_id ON voter_registration_submissions(app_user_id);

-- If table already exists, add new columns (run once)
ALTER TABLE voter_registration_submissions
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS review_note TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS card_pdf TEXT,
  ADD COLUMN IF NOT EXISTS serial_number INTEGER;
