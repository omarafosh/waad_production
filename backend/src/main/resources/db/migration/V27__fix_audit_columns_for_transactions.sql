-- ═══════════════════════════════════════════════════════════════════════════
-- V27: Massive Audit Columns Fix for Remaining Entities (Updated)
-- ═══════════════════════════════════════════════════════════════════════════

-- Applies audit columns (created_by, updated_by, valid_from, valid_to, version)
-- to tables that extend SoftDeleteEntity but were created by old migrations.

DO $$
DECLARE
    -- Added providers, organizations, members based on recent errors and proactive checks
    tables_to_fix TEXT[] := ARRAY[
        'pre_authorizations', 
        'claims', 
        'cpt_codes', 
        'icd_codes', 
        'providers', 
        'organizations', 
        'members'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables_to_fix
    LOOP
        -- Check if table exists first to avoid errors if a previous migration failed to create it
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
        
            -- 1. created_by
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'created_by') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN created_by VARCHAR(100)', tbl);
            END IF;

            -- 2. updated_by
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'updated_by') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN updated_by VARCHAR(100)', tbl);
            END IF;

            -- 3. valid_from
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'valid_from') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN valid_from TIMESTAMP', tbl);
            END IF;

            -- 4. valid_to
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'valid_to') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN valid_to TIMESTAMP', tbl);
            END IF;

            -- 5. version
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'version') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN version BIGINT DEFAULT 0 NOT NULL', tbl);
            END IF;

            -- 6. active (Ensure compatibility)
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'active') THEN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'is_active') THEN
                     EXECUTE format('ALTER TABLE %I RENAME COLUMN is_active TO active', tbl);
                ELSE
                     EXECUTE format('ALTER TABLE %I ADD COLUMN active BOOLEAN DEFAULT TRUE NOT NULL', tbl);
                END IF;
            END IF;

            -- 7. created_at (Ensure existence)
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'created_at') THEN
                 EXECUTE format('ALTER TABLE %I ADD COLUMN created_at TIMESTAMP DEFAULT NOW() NOT NULL', tbl);
            END IF;

            -- 8. updated_at (Ensure existence)
             IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'updated_at') THEN
                 EXECUTE format('ALTER TABLE %I ADD COLUMN updated_at TIMESTAMP DEFAULT NOW() NOT NULL', tbl);
             END IF;
             
        END IF; -- End table existence check
    END LOOP;
END $$;
