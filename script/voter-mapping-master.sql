-- Voter Mapping Master: for Google Sheet import (BoothId, Name, Father's Name, Gender, Age, Voter ID, Village Name)
-- Run in Neon SQL editor. Then use Admin > Voter Mapping Work to import CSV and match with task OCR data.

CREATE TABLE IF NOT EXISTS voter_mapping_master (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  sl_no INTEGER,
  booth_id TEXT,
  name TEXT,
  father_name TEXT,
  house_number TEXT,
  gender TEXT,
  age TEXT,
  voter_id TEXT NOT NULL,
  village_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voter_mapping_master_voter_id ON voter_mapping_master(voter_id);
CREATE INDEX IF NOT EXISTS idx_voter_mapping_master_village ON voter_mapping_master(village_name);
CREATE INDEX IF NOT EXISTS idx_voter_mapping_master_name ON voter_mapping_master(name);
