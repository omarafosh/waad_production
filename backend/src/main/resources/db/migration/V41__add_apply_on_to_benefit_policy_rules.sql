-- Add apply_on column to benefit_policy_rules table
ALTER TABLE benefit_policy_rules 
ADD COLUMN IF NOT EXISTS apply_on VARCHAR(20);

-- Add audit columns to benefit_policies (missing from SoftDeleteEntity mapping in V04)
ALTER TABLE benefit_policies
ADD COLUMN IF NOT EXISTS created_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- Update existing records for apply_on
UPDATE benefit_policy_rules 
SET apply_on = 'SERVICE' 
WHERE medical_service_id IS NOT NULL;

UPDATE benefit_policy_rules 
SET apply_on = 'CATEGORY' 
WHERE medical_category_id IS NOT NULL AND medical_service_id IS NULL;

UPDATE benefit_policy_rules 
SET apply_on = 'PACKAGE' 
WHERE medical_package_id IS NOT NULL AND medical_category_id IS NULL AND medical_service_id IS NULL;
