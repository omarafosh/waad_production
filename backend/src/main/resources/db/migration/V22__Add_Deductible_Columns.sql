-- Add deductible columns to benefit policies and rules
-- Phase 3: Coverage Engine - Financial Logic

-- Add default deductible to policy
ALTER TABLE benefit_policies 
ADD COLUMN IF NOT EXISTS default_deductible_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00;

-- Add specific deductible to rules
ALTER TABLE benefit_policy_rules 
ADD COLUMN IF NOT EXISTS deductible_amount DECIMAL(15, 2);

COMMENT ON COLUMN benefit_policies.default_deductible_amount IS 'Default deductible amount per service (policy-level default)';
COMMENT ON COLUMN benefit_policy_rules.deductible_amount IS 'Specific deductible amount for this rule (overrides policy default)';
