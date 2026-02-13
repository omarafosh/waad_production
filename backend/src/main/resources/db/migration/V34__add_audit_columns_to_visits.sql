-- ═══════════════════════════════════════════════════════════════════════════
-- V34: Add Missing Audit Columns to Visits
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE visits
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP,
ADD COLUMN IF NOT EXISTS valid_to TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_by VARCHAR(50),
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50);

-- Ensure version and active exist (they should, but for completeness)
ALTER TABLE visits ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
