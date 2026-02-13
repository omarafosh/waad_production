-- ═══════════════════════════════════════════════════════════════════════════
-- V21: Fix Lifecycle Reason Codes Column Name (is_active -> active)
-- ═══════════════════════════════════════════════════════════════════════════

-- This fixes the issue where an early version of V19 created 'is_active' 
-- but the Entity expects 'active'.

DO $$
BEGIN
    -- Check if 'is_active' exists and 'active' does not
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lifecycle_reason_codes' 
        AND column_name = 'is_active'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lifecycle_reason_codes' 
        AND column_name = 'active'
    ) THEN
        ALTER TABLE lifecycle_reason_codes RENAME COLUMN is_active TO active;
    END IF;

    -- Double check: if still missing (e.g. neither existed?), ensure 'active' is added
    -- This handles edge cases where table might have been created differently
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lifecycle_reason_codes' 
        AND column_name = 'active'
    ) THEN
       ALTER TABLE lifecycle_reason_codes ADD COLUMN active BOOLEAN DEFAULT TRUE NOT NULL;
    END IF;
END $$;
