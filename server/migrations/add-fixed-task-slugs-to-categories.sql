-- Add fixed_task_slugs to task_categories (for assigning fixed app tasks like Harr Sirr te Chatt, Sunwai to categories).
-- Run this if your DB was created before this column existed.

ALTER TABLE task_categories
ADD COLUMN IF NOT EXISTS fixed_task_slugs text[] DEFAULT '{}';
