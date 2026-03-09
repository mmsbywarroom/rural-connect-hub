-- Add profile_complete and consent_500_sakhi, make father_husband_name nullable (run in SQL editor)
ALTER TABLE mahila_samman_submissions ADD COLUMN IF NOT EXISTS consent_500_sakhi BOOLEAN DEFAULT false;
ALTER TABLE mahila_samman_submissions ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT false;
ALTER TABLE mahila_samman_submissions ALTER COLUMN father_husband_name DROP NOT NULL;
