-- ═══════════════════════════════════════════════════════════════════════════
-- V50: Consolidated Benefit Policies Module (Complete Restructure)
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: Unified, complete schema for Benefit Policies, Rules, and Distributions
-- Replaces: Scattered definitions across V04, V13, V14, V27, V28, V39, V41
-- Date: 2026-02-13
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. BENEFIT POLICIES TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS benefit_policies (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    policy_code VARCHAR(50),
    description VARCHAR(2000),
    
    -- Organization References
    employer_org_id BIGINT NOT NULL,
    insurance_org_id BIGINT,
    
    -- Date Range
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Financial Limits
    annual_limit DECIMAL(15, 2) NOT NULL,
    default_coverage_percent INTEGER NOT NULL DEFAULT 80 
        CHECK (default_coverage_percent >= 0 AND default_coverage_percent <= 100),
    per_member_limit DECIMAL(15, 2),
    per_family_limit DECIMAL(15, 2),
    
    -- Policy Configuration
    default_waiting_period_days INTEGER DEFAULT 0 
        CHECK (default_waiting_period_days >= 0),
    
    -- Status (WITH ENUM CONSTRAINT)
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' 
        CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'TERMINATED', 'CANCELLED', 'INACTIVE', 'ARCHIVED')),
    
    -- Distribution Type (WITH ENUM CONSTRAINT)
    distribution_type VARCHAR(20) NOT NULL DEFAULT 'UNIFIED' 
        CHECK (distribution_type IN ('UNIFIED', 'DISTRIBUTED')),
    
    -- Statistics
    covered_members_count INTEGER DEFAULT 0 
        CHECK (covered_members_count >= 0),
    
    -- Notes
    notes VARCHAR(1000),
    
    -- Soft Delete
    active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    
    -- Versioning (for Optimistic Locking)
    version BIGINT NOT NULL DEFAULT 0,
    valid_from TIMESTAMP,
    valid_to TIMESTAMP,
    
    -- Audit Columns (STANDARDIZED)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Foreign Keys
    CONSTRAINT fk_policy_employer FOREIGN KEY (employer_org_id) 
        REFERENCES organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_policy_insurance FOREIGN KEY (insurance_org_id) 
        REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Business Rules
    CONSTRAINT ck_policy_dates CHECK (start_date <= end_date),
    CONSTRAINT ck_policy_limits CHECK (annual_limit >= 0),
    CONSTRAINT ck_policy_per_member_limit CHECK (per_member_limit IS NULL OR per_member_limit >= 0),
    CONSTRAINT ck_policy_per_family_limit CHECK (per_family_limit IS NULL OR per_family_limit >= 0)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_benefit_policy_employer ON benefit_policies(employer_org_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_benefit_policy_insurance ON benefit_policies(insurance_org_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_benefit_policy_status ON benefit_policies(status) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_benefit_policy_dates ON benefit_policies(start_date, end_date) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_benefit_policy_active ON benefit_policies(active);
CREATE INDEX IF NOT EXISTS idx_benefit_policy_distribution_type ON benefit_policies(distribution_type) WHERE active = TRUE;

-- Comments for Documentation
COMMENT ON TABLE benefit_policies IS 'وثائق التأمين الطبي - Medical benefit policies for employers';
COMMENT ON COLUMN benefit_policies.status IS 'حالة الوثيقة: DRAFT, ACTIVE, EXPIRED, SUSPENDED, TERMINATED, CANCELLED, INACTIVE, ARCHIVED';
COMMENT ON COLUMN benefit_policies.distribution_type IS 'نوع التوزيع: UNIFIED (موحد), DISTRIBUTED (موزع على الفئات)';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. BENEFIT POLICY RULES TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS benefit_policy_rules (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- Policy Reference
    benefit_policy_id BIGINT NOT NULL,
    
    -- Target References (Mutually Exclusive)
    medical_category_id BIGINT,
    medical_service_id BIGINT,
    medical_package_id BIGINT,
    
    -- Apply On Type (WITH ENUM CONSTRAINT)
    apply_on VARCHAR(20) 
        CHECK (apply_on IN ('SERVICE', 'CATEGORY', 'PACKAGE')),
    
    -- Coverage Configuration
    coverage_percent INTEGER 
        CHECK (coverage_percent IS NULL OR (coverage_percent >= 0 AND coverage_percent <= 100)),
    amount_limit DECIMAL(15, 2) 
        CHECK (amount_limit IS NULL OR amount_limit >= 0),
    times_limit INTEGER 
        CHECK (times_limit IS NULL OR times_limit >= 0),
    
    -- Waiting Period
    waiting_period_days INTEGER DEFAULT 0 
        CHECK (waiting_period_days >= 0),
    
    -- Pre-Approval Requirement
    requires_pre_approval BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Encounter Type (WITH ENUM CONSTRAINT)
    encounter_type VARCHAR(30) 
        CHECK (encounter_type IS NULL OR encounter_type IN ('OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'TELECONSULTATION', 'HOME_VISIT')),
    
    -- Label (for UI display)
    label VARCHAR(255),
    
    -- Notes
    notes VARCHAR(500),
    
    -- Soft Delete
    active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    
    -- Audit Columns (STANDARDIZED)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Foreign Keys
    CONSTRAINT fk_rule_policy FOREIGN KEY (benefit_policy_id) 
        REFERENCES benefit_policies(id) ON DELETE CASCADE,
    CONSTRAINT fk_rule_category FOREIGN KEY (medical_category_id) 
        REFERENCES medical_categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_rule_service FOREIGN KEY (medical_service_id) 
        REFERENCES medical_services(id) ON DELETE RESTRICT,
    CONSTRAINT fk_rule_package FOREIGN KEY (medical_package_id) 
        REFERENCES medical_packages(id) ON DELETE RESTRICT,
    
    -- Business Rules: Exactly ONE target must be specified
    CONSTRAINT ck_bpr_target CHECK (
        (medical_category_id IS NOT NULL AND medical_service_id IS NULL AND medical_package_id IS NULL) OR
        (medical_service_id IS NOT NULL AND medical_category_id IS NULL AND medical_package_id IS NULL) OR
        (medical_package_id IS NOT NULL AND medical_category_id IS NULL AND medical_service_id IS NULL)
    ),
    
    -- Business Rule: apply_on must match the target
    CONSTRAINT ck_bpr_apply_on_consistency CHECK (
        (apply_on = 'SERVICE' AND medical_service_id IS NOT NULL) OR
        (apply_on = 'CATEGORY' AND medical_category_id IS NOT NULL) OR
        (apply_on = 'PACKAGE' AND medical_package_id IS NOT NULL) OR
        apply_on IS NULL
    )
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_bpr_policy ON benefit_policy_rules(benefit_policy_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_bpr_category ON benefit_policy_rules(medical_category_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_bpr_service ON benefit_policy_rules(medical_service_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_bpr_package ON benefit_policy_rules(medical_package_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_bpr_active ON benefit_policy_rules(active);
CREATE INDEX IF NOT EXISTS idx_bpr_encounter_type ON benefit_policy_rules(encounter_type) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_bpr_apply_on ON benefit_policy_rules(apply_on) WHERE active = TRUE;

-- Unique Constraints: Prevent duplicate rules
-- Service + Encounter Type (when both are specified)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_service_rule 
ON benefit_policy_rules (benefit_policy_id, medical_service_id, encounter_type) 
WHERE medical_service_id IS NOT NULL AND encounter_type IS NOT NULL AND active = TRUE;

-- Service only (when encounter_type is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_service_rule_null_encounter 
ON benefit_policy_rules (benefit_policy_id, medical_service_id) 
WHERE medical_service_id IS NOT NULL AND encounter_type IS NULL AND active = TRUE;

-- Category + Encounter Type
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_category_rule 
ON benefit_policy_rules (benefit_policy_id, medical_category_id, encounter_type) 
WHERE medical_category_id IS NOT NULL AND encounter_type IS NOT NULL AND active = TRUE;

-- Category only
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_category_rule_null_encounter 
ON benefit_policy_rules (benefit_policy_id, medical_category_id) 
WHERE medical_category_id IS NOT NULL AND encounter_type IS NULL AND active = TRUE;

-- Package + Encounter Type
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_package_rule 
ON benefit_policy_rules (benefit_policy_id, medical_package_id, encounter_type) 
WHERE medical_package_id IS NOT NULL AND encounter_type IS NOT NULL AND active = TRUE;

-- Package only
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_package_rule_null_encounter 
ON benefit_policy_rules (benefit_policy_id, medical_package_id) 
WHERE medical_package_id IS NOT NULL AND encounter_type IS NULL AND active = TRUE;

-- Comments for Documentation
COMMENT ON TABLE benefit_policy_rules IS 'قواعد التغطية - Coverage rules for benefit policies';
COMMENT ON COLUMN benefit_policy_rules.apply_on IS 'نوع التطبيق: SERVICE (خدمة), CATEGORY (فئة), PACKAGE (باقة)';
COMMENT ON COLUMN benefit_policy_rules.encounter_type IS 'نوع الزيارة: OUTPATIENT, INPATIENT, EMERGENCY, TELECONSULTATION, HOME_VISIT';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. COVERAGE DISTRIBUTIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS coverage_distributions (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- Policy Reference
    benefit_policy_id BIGINT NOT NULL,
    
    -- Target References (Mutually Exclusive)
    medical_category_id BIGINT,
    medical_service_id BIGINT,
    
    -- Limit Amount
    limit_amount DECIMAL(15, 2) NOT NULL 
        CHECK (limit_amount >= 0),
    
    -- Soft Delete
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit Columns (STANDARDIZED)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Foreign Keys
    CONSTRAINT fk_dist_policy FOREIGN KEY (benefit_policy_id) 
        REFERENCES benefit_policies(id) ON DELETE CASCADE,
    CONSTRAINT fk_dist_category FOREIGN KEY (medical_category_id) 
        REFERENCES medical_categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_dist_service FOREIGN KEY (medical_service_id) 
        REFERENCES medical_services(id) ON DELETE RESTRICT,
    
    -- Business Rule: Exactly ONE target must be specified
    CONSTRAINT ck_dist_target CHECK (
        (medical_category_id IS NOT NULL AND medical_service_id IS NULL) OR
        (medical_service_id IS NOT NULL AND medical_category_id IS NULL)
    )
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_dist_policy ON coverage_distributions(benefit_policy_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_dist_category ON coverage_distributions(medical_category_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_dist_service ON coverage_distributions(medical_service_id) WHERE active = TRUE;

-- Unique Constraints: Prevent duplicate distributions
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_dist_category 
ON coverage_distributions (benefit_policy_id, medical_category_id) 
WHERE medical_category_id IS NOT NULL AND active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_dist_service 
ON coverage_distributions (benefit_policy_id, medical_service_id) 
WHERE medical_service_id IS NOT NULL AND active = TRUE;

-- Comments for Documentation
COMMENT ON TABLE coverage_distributions IS 'توزيع التغطية - Coverage distribution limits for policies';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. BENEFIT POLICY AUDIT TABLE (History Tracking)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS benefit_policy_audit (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- Policy Reference
    benefit_policy_id BIGINT NOT NULL,
    
    -- Audit Information
    action VARCHAR(50) NOT NULL 
        CHECK (action IN ('CREATED', 'UPDATED', 'ACTIVATED', 'SUSPENDED', 'EXPIRED', 'TERMINATED', 'CANCELLED', 'ARCHIVED', 'DELETED', 'RESTORED')),
    reason VARCHAR(500),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    
    -- Audit Metadata
    performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    performed_by VARCHAR(100) NOT NULL,
    
    -- Foreign Key
    CONSTRAINT fk_audit_policy FOREIGN KEY (benefit_policy_id) 
        REFERENCES benefit_policies(id) ON DELETE CASCADE
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_audit_policy ON benefit_policy_audit(benefit_policy_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON benefit_policy_audit(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON benefit_policy_audit(action);

-- Comments for Documentation
COMMENT ON TABLE benefit_policy_audit IS 'سجل التدقيق - Audit trail for benefit policy changes';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ═══════════════════════════════════════════════════════════════════════════

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_benefit_policy_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for benefit_policies
DROP TRIGGER IF EXISTS trg_benefit_policies_updated_at ON benefit_policies;
CREATE TRIGGER trg_benefit_policies_updated_at
    BEFORE UPDATE ON benefit_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_benefit_policy_timestamp();

-- Trigger for benefit_policy_rules
DROP TRIGGER IF EXISTS trg_benefit_policy_rules_updated_at ON benefit_policy_rules;
CREATE TRIGGER trg_benefit_policy_rules_updated_at
    BEFORE UPDATE ON benefit_policy_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_benefit_policy_timestamp();

-- Trigger for coverage_distributions
DROP TRIGGER IF EXISTS trg_coverage_distributions_updated_at ON coverage_distributions;
CREATE TRIGGER trg_coverage_distributions_updated_at
    BEFORE UPDATE ON coverage_distributions
    FOR EACH ROW
    EXECUTE FUNCTION update_benefit_policy_timestamp();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. DATA MIGRATION (If tables already exist)
-- ═══════════════════════════════════════════════════════════════════════════

-- Add missing columns to existing tables (idempotent)

-- benefit_policies
DO $$
BEGIN
    -- distribution_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefit_policies' AND column_name = 'distribution_type') THEN
        ALTER TABLE benefit_policies ADD COLUMN distribution_type VARCHAR(20) NOT NULL DEFAULT 'UNIFIED';
    END IF;
    
    -- deleted columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefit_policies' AND column_name = 'deleted') THEN
        ALTER TABLE benefit_policies ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefit_policies' AND column_name = 'deleted_at') THEN
        ALTER TABLE benefit_policies ADD COLUMN deleted_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefit_policies' AND column_name = 'deleted_by') THEN
        ALTER TABLE benefit_policies ADD COLUMN deleted_by VARCHAR(100);
    END IF;
END $$;

-- benefit_policy_rules
DO $$
BEGIN
    -- apply_on
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefit_policy_rules' AND column_name = 'apply_on') THEN
        ALTER TABLE benefit_policy_rules ADD COLUMN apply_on VARCHAR(20);
        
        -- Populate apply_on based on existing data
        UPDATE benefit_policy_rules SET apply_on = 'SERVICE' WHERE medical_service_id IS NOT NULL;
        UPDATE benefit_policy_rules SET apply_on = 'CATEGORY' WHERE medical_category_id IS NOT NULL AND medical_service_id IS NULL;
        UPDATE benefit_policy_rules SET apply_on = 'PACKAGE' WHERE medical_package_id IS NOT NULL AND medical_category_id IS NULL AND medical_service_id IS NULL;
    END IF;
    
    -- label
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefit_policy_rules' AND column_name = 'label') THEN
        ALTER TABLE benefit_policy_rules ADD COLUMN label VARCHAR(255);
    END IF;
    
    -- deleted columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefit_policy_rules' AND column_name = 'deleted') THEN
        ALTER TABLE benefit_policy_rules ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefit_policy_rules' AND column_name = 'deleted_at') THEN
        ALTER TABLE benefit_policy_rules ADD COLUMN deleted_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefit_policy_rules' AND column_name = 'deleted_by') THEN
        ALTER TABLE benefit_policy_rules ADD COLUMN deleted_by VARCHAR(100);
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. VALIDATION SCRIPT (Check data integrity)
-- ═══════════════════════════════════════════════════════════════════════════

-- Check for invalid status values
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM benefit_policies
    WHERE status NOT IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'TERMINATED', 'CANCELLED', 'INACTIVE', 'ARCHIVED');
    
    IF invalid_count > 0 THEN
        RAISE WARNING 'Found % benefit_policies with invalid status values', invalid_count;
    END IF;
END $$;

-- Check for invalid distribution_type values
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM benefit_policies
    WHERE distribution_type NOT IN ('UNIFIED', 'DISTRIBUTED');
    
    IF invalid_count > 0 THEN
        RAISE WARNING 'Found % benefit_policies with invalid distribution_type values', invalid_count;
    END IF;
END $$;

-- Check for invalid encounter_type values
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM benefit_policy_rules
    WHERE encounter_type IS NOT NULL 
    AND encounter_type NOT IN ('OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'TELECONSULTATION', 'HOME_VISIT');
    
    IF invalid_count > 0 THEN
        RAISE WARNING 'Found % benefit_policy_rules with invalid encounter_type values', invalid_count;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════
