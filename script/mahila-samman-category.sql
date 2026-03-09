-- Add category column for Mahila Samman Sakhi caste/category (General/OBC/SC/ST)
ALTER TABLE mahila_samman_submissions
ADD COLUMN IF NOT EXISTS category TEXT;

