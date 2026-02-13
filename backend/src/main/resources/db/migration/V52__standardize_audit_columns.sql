-- ═══════════════════════════════════════════════════════════════════════════
-- V52: Standardize Audit Columns Across All Tables
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: Ensure all tables have consistent audit column definitions
-- Date: 2026-02-13
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- STANDARD AUDIT COLUMNS DEFINITION
-- ═══════════════════════════════════════════════════════════════════════════
-- All tables should have:
-- - created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
-- - updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
-- - created_by VARCHAR(100)
-- - updated_by VARCHAR(100)
--
-- Tables extending SoftDeleteEntity should also have:
-- - active BOOLEAN NOT NULL DEFAULT TRUE
-- - deleted BOOLEAN NOT NULL DEFAULT FALSE
-- - deleted_at TIMESTAMP
-- - deleted_by VARCHAR(100)
-- - version BIGINT NOT NULL DEFAULT 0
-- - valid_from TIMESTAMP
-- - valid_to TIMESTAMP
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. HELPER FUNCTION TO ADD AUDIT COLUMNS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION add_standard_audit_columns(table_name TEXT, include_soft_delete BOOLEAN DEFAULT FALSE)
RETURNS VOID AS $$
BEGIN
    -- created_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'created_at') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP', $1);
    ELSE
        -- Ensure it has the correct default
        EXECUTE format('ALTER TABLE %I ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP', $1);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN created_at SET NOT NULL', $1);
    END IF;
    
    -- updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'updated_at') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP', $1);
    ELSE
        EXECUTE format('ALTER TABLE %I ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP', $1);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN updated_at SET NOT NULL', $1);
    END IF;
    
    -- created_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'created_by') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN created_by VARCHAR(100)', $1);
    END IF;
    
    -- updated_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'updated_by') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN updated_by VARCHAR(100)', $1);
    END IF;
    
    -- Soft delete columns (if requested)
    IF include_soft_delete THEN
        -- active
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'active') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE', $1);
        END IF;
        
        -- deleted
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'deleted') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE', $1);
        END IF;
        
        -- deleted_at
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'deleted_at') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN deleted_at TIMESTAMP', $1);
        END IF;
        
        -- deleted_by
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'deleted_by') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN deleted_by VARCHAR(100)', $1);
        END IF;
        
        -- version (for optimistic locking)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'version') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN version BIGINT NOT NULL DEFAULT 0', $1);
        END IF;
        
        -- valid_from
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'valid_from') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN valid_from TIMESTAMP', $1);
        END IF;
        
        -- valid_to
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'valid_to') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN valid_to TIMESTAMP', $1);
        END IF;
    END IF;
    
    RAISE NOTICE 'Standardized audit columns for table: %', $1;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. APPLY TO ALL TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Tables with Soft Delete (extend SoftDeleteEntity)
SELECT add_standard_audit_columns('benefit_policies', TRUE);
SELECT add_standard_audit_columns('benefit_policy_rules', TRUE);
SELECT add_standard_audit_columns('coverage_distributions', TRUE);
SELECT add_standard_audit_columns('members', TRUE);
SELECT add_standard_audit_columns('providers', TRUE);
SELECT add_standard_audit_columns('provider_contracts', TRUE);
SELECT add_standard_audit_columns('claims', TRUE);
SELECT add_standard_audit_columns('claim_lines', TRUE);
SELECT add_standard_audit_columns('pre_authorizations', TRUE);
SELECT add_standard_audit_columns('visits', TRUE);
SELECT add_standard_audit_columns('organizations', TRUE);
SELECT add_standard_audit_columns('medical_categories', TRUE);
SELECT add_standard_audit_columns('medical_services', TRUE);
SELECT add_standard_audit_columns('medical_packages', TRUE);

-- Tables without Soft Delete (simple audit only)
SELECT add_standard_audit_columns('settlement_batches', FALSE);
SELECT add_standard_audit_columns('approval_requests', FALSE);
SELECT add_standard_audit_columns('benefit_policy_audit', FALSE);
SELECT add_standard_audit_columns('cpt_codes', FALSE);
SELECT add_standard_audit_columns('icd_codes', FALSE);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. CREATE/UPDATE TRIGGERS FOR AUTOMATIC updated_at
-- ═══════════════════════════════════════════════════════════════════════════

-- Generic trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        -- Drop existing trigger if exists
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I', tbl.table_name, tbl.table_name);
        
        -- Create new trigger
        EXECUTE format('
            CREATE TRIGGER trg_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
        ', tbl.table_name, tbl.table_name);
        
        RAISE NOTICE 'Created updated_at trigger for table: %', tbl.table_name;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. FIX INCONSISTENT COLUMN TYPES
-- ═══════════════════════════════════════════════════════════════════════════

-- Ensure created_by and updated_by are VARCHAR(100) everywhere
DO $$
DECLARE
    tbl RECORD;
BEGIN
    -- Fix created_by
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'created_by' 
        AND table_schema = 'public'
        AND (character_maximum_length != 100 OR character_maximum_length IS NULL)
    LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN created_by TYPE VARCHAR(100)', tbl.table_name);
        RAISE NOTICE 'Fixed created_by type for table: %', tbl.table_name;
    END LOOP;
    
    -- Fix updated_by
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_by' 
        AND table_schema = 'public'
        AND (character_maximum_length != 100 OR character_maximum_length IS NULL)
    LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN updated_by TYPE VARCHAR(100)', tbl.table_name);
        RAISE NOTICE 'Fixed updated_by type for table: %', tbl.table_name;
    END LOOP;
    
    -- Fix deleted_by
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'deleted_by' 
        AND table_schema = 'public'
        AND (character_maximum_length != 100 OR character_maximum_length IS NULL)
    LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN deleted_by TYPE VARCHAR(100)', tbl.table_name);
        RAISE NOTICE 'Fixed deleted_by type for table: %', tbl.table_name;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. VALIDATION REPORT
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    tbl RECORD;
    missing_columns TEXT := '';
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'AUDIT COLUMNS VALIDATION REPORT';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Check for tables missing audit columns
    FOR tbl IN 
        SELECT t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name NOT LIKE '%_audit'
        AND t.table_name NOT LIKE '%_history'
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_name = t.table_name
            AND c.column_name = 'created_at'
        )
    LOOP
        RAISE WARNING 'Table % is missing created_at column', tbl.table_name;
    END LOOP;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'VALIDATION COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. CLEANUP HELPER FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop the helper function (no longer needed after migration)
DROP FUNCTION IF EXISTS add_standard_audit_columns(TEXT, BOOLEAN);

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════
