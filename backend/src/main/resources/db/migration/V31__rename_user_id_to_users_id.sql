-- ═══════════════════════════════════════════════════════════════════════════
-- V31: Rename user_id to users_id in Refresh Tokens
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- Check if the column exists with the old name 'user_id'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refresh_tokens' AND column_name = 'user_id') THEN
        ALTER TABLE refresh_tokens RENAME COLUMN user_id TO users_id;
    END IF;
END $$;
