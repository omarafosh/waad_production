-- ═══════════════════════════════════════════════════════════════════════════
-- V25: Add Audit and Version Columns to Medical Services
-- ═══════════════════════════════════════════════════════════════════════════

-- MedicalService extends SoftDeleteEntity, so it needs:
-- created_by, updated_by, valid_from, valid_to, version, (active, created_at, updated_at)

DO $$
BEGIN
    -- 1. created_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_services' AND column_name = 'created_by') THEN
        ALTER TABLE medical_services ADD COLUMN created_by VARCHAR(100);
    END IF;

    -- 2. updated_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_services' AND column_name = 'updated_by') THEN
        ALTER TABLE medical_services ADD COLUMN updated_by VARCHAR(100);
    END IF;

    -- 3. valid_from
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_services' AND column_name = 'valid_from') THEN
        ALTER TABLE medical_services ADD COLUMN valid_from TIMESTAMP;
    END IF;

    -- 4. valid_to
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_services' AND column_name = 'valid_to') THEN
        ALTER TABLE medical_services ADD COLUMN valid_to TIMESTAMP;
    END IF;

    -- 5. version
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_services' AND column_name = 'version') THEN
        ALTER TABLE medical_services ADD COLUMN version BIGINT DEFAULT 0 NOT NULL;
    END IF;

    -- 6. Ensure active/created_at/updated_at exist (just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_services' AND column_name = 'active') THEN
        -- Handle is_active rename if necessary
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_services' AND column_name = 'is_active') THEN
            ALTER TABLE medical_services RENAME COLUMN is_active TO active;
        ELSE
            ALTER TABLE medical_services ADD COLUMN active BOOLEAN DEFAULT TRUE NOT NULL;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_services' AND column_name = 'created_at') THEN
         ALTER TABLE medical_services ADD COLUMN created_at TIMESTAMP DEFAULT NOW() NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_services' AND column_name = 'updated_at') THEN
         ALTER TABLE medical_services ADD COLUMN updated_at TIMESTAMP DEFAULT NOW() NOT NULL;
    END IF;

END $$;
