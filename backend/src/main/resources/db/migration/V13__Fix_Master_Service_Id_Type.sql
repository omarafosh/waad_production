-- ═══════════════════════════════════════════════════════════════════════════
-- V13: FIX MASTER_SERVICE_ID TYPE MISMATCH
-- ═══════════════════════════════════════════════════════════════════════════
-- Description: Fixes incompatibility between provider_service_mappings (UUID) 
-- and ent_medical_services (BIGINT).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Ensure the table exists or handle it gracefully
DO $$ 
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'provider_service_mappings') THEN
        
        -- Drop the problematic constraint if it exists
        -- Note: Hibernate names are often random, we find it by column
        EXECUTE (
            SELECT 'ALTER TABLE provider_service_mappings DROP CONSTRAINT ' || quote_ident(constraint_name)
            FROM information_schema.key_column_usage
            WHERE table_name = 'provider_service_mappings' 
            AND column_name = 'master_service_id'
            AND constraint_name LIKE 'fk%'
            LIMIT 1
        );

        -- Alter column type to BIGINT
        -- Using NULL for conversion because UUID to BIGINT is not possible directly and sync will re-populate it.
        ALTER TABLE provider_service_mappings 
        ALTER COLUMN master_service_id TYPE BIGINT USING NULL;

        -- Re-add correctly typed foreign key
        ALTER TABLE provider_service_mappings 
        ADD CONSTRAINT fk_psm_master_service 
        FOREIGN KEY (master_service_id) REFERENCES ent_medical_services(id);

    END IF;
END $$;
