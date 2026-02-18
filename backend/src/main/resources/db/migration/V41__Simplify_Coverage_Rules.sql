-- ═══════════════════════════════════════════════════════════════════════════
-- V41: Simplify Coverage Rules Schema
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose:
--   1. Add apply_on column to sync DB with Java entity
--   2. Remove amount_limit column (redundant with times_limit)
--   3. Make encounter_type NOT NULL (coverage type is mandatory)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add apply_on column (sync with ApplyOnType enum in Java entity)
ALTER TABLE benefit_policy_rules
    ADD COLUMN IF NOT EXISTS apply_on VARCHAR(20);

-- Backfill existing rows
UPDATE benefit_policy_rules SET apply_on =
    CASE
        WHEN medical_service_id  IS NOT NULL THEN 'SERVICE'
        WHEN medical_package_id  IS NOT NULL THEN 'PACKAGE'
        WHEN medical_category_id IS NOT NULL THEN 'CATEGORY'
        ELSE 'CATEGORY'
    END
WHERE apply_on IS NULL;

-- 2. Remove amount_limit column (user confirmed redundant)
ALTER TABLE benefit_policy_rules
    DROP COLUMN IF EXISTS amount_limit;

-- 3. Update encounter_type constraint to enforce the 8 standard coverage types
--    (V40 already expanded the allowed values; this step makes it NOT NULL)
--    NOTE: We first set a default for any existing NULL rows before adding NOT NULL.
UPDATE benefit_policy_rules
    SET encounter_type = 'OUTPATIENT'
    WHERE encounter_type IS NULL;

-- Make encounter_type mandatory (coverage type is now required)
ALTER TABLE benefit_policy_rules
    ALTER COLUMN encounter_type SET NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- Summary of changes:
--   + apply_on VARCHAR(20)  — tracks whether rule targets SERVICE/CATEGORY/PACKAGE
--   - amount_limit           — removed (redundant)
--   * encounter_type         — now NOT NULL (coverage type is mandatory)
-- ═══════════════════════════════════════════════════════════════════════════
