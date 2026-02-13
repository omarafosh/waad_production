-- ═══════════════════════════════════════════════════════════════════════════
-- V33: Add Description Column to Visit Attachments
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE visit_attachments ADD COLUMN IF NOT EXISTS description VARCHAR(1000);
