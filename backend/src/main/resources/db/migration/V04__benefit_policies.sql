-- ═══════════════════════════════════════════════════════════════════════════
-- 04. Benefit Policies (Consolidated & Refined)
-- ═══════════════════════════════════════════════════════════════════════════
-- Matches BenefitPolicy.java and BenefitPolicyRule.java entities.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. BENEFIT POLICIES
CREATE TABLE IF NOT EXISTS benefit_policies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    policy_code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(2000),
    
    employer_org_id BIGINT NOT NULL,
    insurance_org_id BIGINT,
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    annual_limit DECIMAL(15, 2) NOT NULL,
    default_coverage_percent INTEGER NOT NULL DEFAULT 80,
    
    per_member_limit DECIMAL(15, 2),
    per_family_limit DECIMAL(15, 2),
    
    default_waiting_period_days INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    
    covered_members_count INTEGER DEFAULT 0,
    notes VARCHAR(2000),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit & Versioning
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Soft Delete
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    
    CONSTRAINT fk_policy_employer FOREIGN KEY (employer_org_id) REFERENCES organizations(id),
    CONSTRAINT fk_policy_insurance FOREIGN KEY (insurance_org_id) REFERENCES organizations(id),
    CONSTRAINT chk_benefit_policy_status CHECK (status IN ('DRAFT', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED'))
);

CREATE INDEX IF NOT EXISTS idx_benefit_policy_employer ON benefit_policies(employer_org_id);
CREATE INDEX IF NOT EXISTS idx_benefit_policy_status ON benefit_policies(status);
CREATE INDEX IF NOT EXISTS idx_benefit_policy_code ON benefit_policies(policy_code);

-- 2. BENEFIT POLICY RULES
CREATE TABLE IF NOT EXISTS benefit_policy_rules (
    id BIGSERIAL PRIMARY KEY,
    benefit_policy_id BIGINT NOT NULL,
    
    -- Rule Target (Exclusive OR)
    medical_category_id BIGINT,
    medical_service_id BIGINT,
    medical_package_id BIGINT,
    
    coverage_percent INTEGER,
    amount_limit DECIMAL(15, 2),
    times_limit INTEGER,
    
    waiting_period_days INTEGER DEFAULT 0,
    requires_pre_approval BOOLEAN NOT NULL DEFAULT FALSE,
    encounter_type VARCHAR(30), -- OUTPATIENT, INPATIENT, EMERGENCY, etc.
    
    notes VARCHAR(1000),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    CONSTRAINT fk_rule_policy FOREIGN KEY (benefit_policy_id) REFERENCES benefit_policies(id) ON DELETE CASCADE,
    CONSTRAINT fk_rule_category FOREIGN KEY (medical_category_id) REFERENCES medical_categories(id),
    CONSTRAINT fk_rule_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id),
    CONSTRAINT fk_rule_package FOREIGN KEY (medical_package_id) REFERENCES medical_packages(id),
    
    CONSTRAINT chk_bpr_target CHECK (
        (medical_category_id IS NOT NULL AND medical_service_id IS NULL AND medical_package_id IS NULL) OR
        (medical_service_id IS NOT NULL AND medical_category_id IS NULL AND medical_package_id IS NULL) OR
        (medical_package_id IS NOT NULL AND medical_category_id IS NULL AND medical_service_id IS NULL)
    ),
    CONSTRAINT chk_bpr_encounter_type CHECK (encounter_type IN ('OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'DENTAL', 'OPTICAL', 'PHARMACY'))
);

CREATE INDEX IF NOT EXISTS idx_bpr_policy ON benefit_policy_rules(benefit_policy_id);
CREATE INDEX IF NOT EXISTS idx_bpr_active ON benefit_policy_rules(active);

-- 3. UNIQUE CONSTRAINTS FOR RULES
-- Prevents overlapping rules for the same service/category within a policy
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_service_rule 
ON benefit_policy_rules (benefit_policy_id, medical_service_id, COALESCE(encounter_type, 'ALL')) 
WHERE medical_service_id IS NOT NULL AND active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_category_rule 
ON benefit_policy_rules (benefit_policy_id, medical_category_id, COALESCE(encounter_type, 'ALL')) 
WHERE medical_category_id IS NOT NULL AND active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_package_rule 
ON benefit_policy_rules (benefit_policy_id, medical_package_id, COALESCE(encounter_type, 'ALL')) 
WHERE medical_package_id IS NOT NULL AND active = TRUE;
