-- Add OCR columns to tirth_yatra_requests (run in SQL editor)
ALTER TABLE tirth_yatra_requests ADD COLUMN IF NOT EXISTS ocr_aadhaar_text TEXT;
ALTER TABLE tirth_yatra_requests ADD COLUMN IF NOT EXISTS ocr_voter_text TEXT;
ALTER TABLE tirth_yatra_requests ADD COLUMN IF NOT EXISTS ocr_voter_id TEXT;
