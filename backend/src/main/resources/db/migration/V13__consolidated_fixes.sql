-- ═══════════════════════════════════════════════════════════════════════════
-- V13: Consolidated Schema Fixes & Alignment (Comprehensive)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Fix ApprovalRequest Payload Type Mismatch
ALTER TABLE approval_requests 
ALTER COLUMN payload TYPE TEXT USING payload::text;

-- 2. Comprehensive Audit Columns Addition
-- We add created_by and updated_by to all entities that might extend SoftDeleteEntity
-- or otherwise require auditing. Using IF NOT EXISTS makes this safe to run explicitly.

-- Core Tables
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE members ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE members ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- Provider Module
ALTER TABLE providers ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- Claims Module
ALTER TABLE claims ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE claim_lines ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE claim_lines ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- Benefits Module
ALTER TABLE benefit_policies ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE benefit_policies ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE benefit_policy_rules ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE benefit_policy_rules ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- PreAuth & Visits
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE visits ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- Settlement
ALTER TABLE settlement_batches ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE settlement_batches ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- 3. Ensure created_by/updated_by are consistent across the board (Optional length fix)
-- Some older tables might have length 255, we standardize on VARCHAR(100) implied above.
-- If columns exist with different length, this ALTER ADD COLUMN IF NOT EXISTS does nothing,
-- which is fine.
