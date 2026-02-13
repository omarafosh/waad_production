-- ═══════════════════════════════════════════════════════════════════════════
-- V29: Create Auth Tables (RefreshToken & Others)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiry_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_refresh_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ROBUST CHECK: If table existed without user_id or users_id, ensure column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refresh_tokens' AND (column_name = 'user_id' OR column_name = 'users_id')) THEN
         ALTER TABLE refresh_tokens ADD COLUMN user_id BIGINT NOT NULL;
         ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index only if the column exists (handles both old 'user_id' and renamed 'users_id')
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refresh_tokens' AND column_name = 'user_id') THEN
        -- Check if index itself doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'refresh_tokens' AND indexname = 'idx_refresh_token_user') THEN
            CREATE INDEX idx_refresh_token_user ON refresh_tokens(user_id);
        END IF;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refresh_tokens' AND column_name = 'users_id') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'refresh_tokens' AND indexname = 'idx_refresh_token_user') THEN
            CREATE INDEX idx_refresh_token_user ON refresh_tokens(users_id);
        END IF;
    END IF;
END $$;
