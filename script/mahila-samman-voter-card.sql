-- Add voter card image column for Mahila Samman submissions
ALTER TABLE mahila_samman_submissions
  ADD COLUMN IF NOT EXISTS voter_card TEXT;

