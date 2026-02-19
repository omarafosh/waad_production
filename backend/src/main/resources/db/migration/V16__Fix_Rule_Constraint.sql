-- ═══════════════════════════════════════════════════════════════════════════
-- V16. Fix Rule Target Constraint & Enable Global Rules
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Remove the old restrictive constraint that forced Category, Service, or Package
ALTER TABLE benefit_policy_rules DROP CONSTRAINT IF EXISTS chk_bpr_target;

-- 2. Add a relaxed constraint that allows ALL to be NULL (Global rule)
-- but still prevents having two targets at once.
ALTER TABLE benefit_policy_rules ADD CONSTRAINT chk_bpr_target CHECK (
    -- Case 1: Category rule
    (medical_category_id IS NOT NULL AND medical_service_id IS NULL AND medical_package_id IS NULL) OR
    -- Case 2: Service rule
    (medical_service_id IS NOT NULL AND medical_category_id IS NULL AND medical_package_id IS NULL) OR
    -- Case 3: Package rule
    (medical_package_id IS NOT NULL AND medical_category_id IS NULL AND medical_service_id IS NULL) OR
    -- Case 4: Global rule (Encounter type only)
    (medical_category_id IS NULL AND medical_service_id IS NULL AND medical_package_id IS NULL)
);

-- 3. Add Unique Index for Global Rules (Prevent duplicates for the same encounter type)
-- This ensures each policy can have only one global "OUTPATIENT" rule, one "INPATIENT" rule, etc.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_global_rule 
ON benefit_policy_rules (benefit_policy_id, encounter_type) 
WHERE medical_category_id IS NULL 
  AND medical_service_id IS NULL 
  AND medical_package_id IS NULL 
  AND active = TRUE 
  AND deleted = FALSE;

-- 4. Fix Index terminology in DB (Optional, but good for alignment with JPA)
-- JPA expects medical_category_id based on the refactored entity.
DROP INDEX IF EXISTS idx_bpr_category;
CREATE INDEX IF NOT EXISTS idx_bpr_category_id ON benefit_policy_rules(medical_category_id);
