-- ═══════════════════════════════════════════════════════════════════════════
-- V14: Comprehensive Audit Columns & Schema Fixes (Supersedes V13)
-- ═══════════════════════════════════════════════════════════════════════════
-- Created because V13 might have been applied partially in an earlier run.
-- Using IF NOT EXISTS / IF EXISTS ensures idempotency.

-- 1. Fix ApprovalRequest Payload Type Mismatch (Idempotent)
-- We check if it's already TEXT, if not we convert.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'approval_requests' 
        AND column_name = 'payload' 
        AND data_type != 'text'
    ) THEN
        ALTER TABLE approval_requests ALTER COLUMN payload TYPE TEXT USING payload::text;
    END IF;
END $$;


-- 2. Comprehensive Audit Columns Addition
-- We add created_by and updated_by to all entities. 
-- V13 might have added some, so IF NOT EXISTS is crucial.

-- Benefit Policies (The source of the error)
ALTER TABLE benefit_policies ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE benefit_policies ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- Benefit Policy Rules
ALTER TABLE benefit_policy_rules ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE benefit_policy_rules ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- Organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- Members
ALTER TABLE members ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE members ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- Providers
ALTER TABLE providers ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- Provider Contracts
ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- Claims
ALTER TABLE claims ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- Claim Lines
ALTER TABLE claim_lines ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE claim_lines ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- PreAuthorizations
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- Visits
ALTER TABLE visits ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- Settlement Batches
ALTER TABLE settlement_batches ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE settlement_batches ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);
