-- ═══════════════════════════════════════════════════════════════════════════
-- V24: Fix Medical Packages Schema (Add total_coverage_limit)
-- ═══════════════════════════════════════════════════════════════════════════

-- Add total_coverage_limit which is present in Entity but missing in DB
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_packages' AND column_name = 'total_coverage_limit') THEN
        ALTER TABLE medical_packages ADD COLUMN total_coverage_limit NUMERIC(19, 2);
    END IF;

    -- Ensure 'active' column exists (Entity has it, V04 might have missed it or named it is_active)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_packages' AND column_name = 'active') THEN
        -- Check if is_active exists instead
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_packages' AND column_name = 'is_active') THEN
            ALTER TABLE medical_packages RENAME COLUMN is_active TO active;
        ELSE
            ALTER TABLE medical_packages ADD COLUMN active BOOLEAN DEFAULT TRUE NOT NULL;
        END IF;
    END IF;
END $$;
