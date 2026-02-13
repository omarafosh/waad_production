-- ═══════════════════════════════════════════════════════════════════════════
-- V30: Add Revoked Column to Refresh Tokens
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT FALSE NOT NULL;
