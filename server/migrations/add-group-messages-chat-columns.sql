-- Add chat feature columns to group_messages (reply, audio, delete for me/everyone, reactions)
-- Run this in pgAdmin or: psql $DATABASE_URL -f server/migrations/add-group-messages-chat-columns.sql

-- Add columns if not present (PostgreSQL 9.5+)
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS reply_to_message_id varchar(255);
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS deleted_for_everyone boolean DEFAULT false;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS deleted_for_user_ids jsonb DEFAULT '[]'::jsonb;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;

-- Optional: FK for reply (uncomment if you want referential integrity)
-- ALTER TABLE group_messages
--   ADD CONSTRAINT fk_reply_to_message
--   FOREIGN KEY (reply_to_message_id) REFERENCES group_messages(id) ON DELETE SET NULL;

-- ===== Group calls (audio/video) =====
CREATE TABLE IF NOT EXISTS group_calls (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id varchar(255) NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  type text NOT NULL,
  created_by varchar(255) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ringing',
  created_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS group_call_participants (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id varchar(255) NOT NULL REFERENCES group_calls(id) ON DELETE CASCADE,
  app_user_id varchar(255) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'invited',
  joined_at timestamp with time zone
);
