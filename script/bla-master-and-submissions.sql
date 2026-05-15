-- BLA master roster + extended submission columns (safe re-run)

CREATE TABLE IF NOT EXISTS bla_master (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  booth_number TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bla_master_booth ON bla_master(booth_number);
CREATE INDEX IF NOT EXISTS idx_bla_master_serial ON bla_master(serial_number);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bla_submissions' AND column_name = 'bla_master_id') THEN
    ALTER TABLE bla_submissions ADD COLUMN bla_master_id VARCHAR REFERENCES bla_master(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bla_submissions' AND column_name = 'booth_number') THEN
    ALTER TABLE bla_submissions ADD COLUMN booth_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bla_submissions' AND column_name = 'aadhaar_number') THEN
    ALTER TABLE bla_submissions ADD COLUMN aadhaar_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bla_submissions' AND column_name = 'epic_number') THEN
    ALTER TABLE bla_submissions ADD COLUMN epic_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bla_submissions' AND column_name = 'gender') THEN
    ALTER TABLE bla_submissions ADD COLUMN gender TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bla_submissions' AND column_name = 'health_card_made') THEN
    ALTER TABLE bla_submissions ADD COLUMN health_card_made TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bla_submissions' AND column_name = 'msr_registered') THEN
    ALTER TABLE bla_submissions ADD COLUMN msr_registered TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bla_submissions' AND column_name = 'bla_relation') THEN
    ALTER TABLE bla_submissions ADD COLUMN bla_relation TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bla_submissions' AND column_name = 'caste_category') THEN
    ALTER TABLE bla_submissions ADD COLUMN caste_category TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bla_submissions' AND column_name = 'bla_live_photo') THEN
    ALTER TABLE bla_submissions ADD COLUMN bla_live_photo TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bla_submissions' AND column_name = 'computer_data_entry') THEN
    ALTER TABLE bla_submissions ADD COLUMN computer_data_entry TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bla_submissions' AND column_name = 'digital_skills') THEN
    ALTER TABLE bla_submissions ADD COLUMN digital_skills JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bla_submissions' AND column_name = 'completion_percentage') THEN
    ALTER TABLE bla_submissions ADD COLUMN completion_percentage INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bla_submissions' AND column_name = 'status') THEN
    ALTER TABLE bla_submissions ADD COLUMN status TEXT DEFAULT 'incomplete' NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bla_submissions' AND column_name = 'updated_at') THEN
    ALTER TABLE bla_submissions ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;
