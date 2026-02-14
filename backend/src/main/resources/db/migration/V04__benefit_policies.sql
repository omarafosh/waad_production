-- ═══════════════════════════════════════════════════════════════════════════
-- 04. Benefit Policies (Consolidated)
-- ═══════════════════════════════════════════════════════════════════════════
-- Sources: V1.05, V9001, V9005
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. BENEFIT POLICIES
CREATE TABLE IF NOT EXISTS benefit_policies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    policy_code VARCHAR(50),
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
    notes VARCHAR(1000),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Universal Columns (V9001)
    version BIGINT DEFAULT 0,
    valid_from TIMESTAMP,
    valid_to TIMESTAMP,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_policy_employer FOREIGN KEY (employer_org_id) REFERENCES organizations(id),
    CONSTRAINT fk_policy_insurance FOREIGN KEY (insurance_org_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_benefit_policy_employer ON benefit_policies(employer_org_id);
CREATE INDEX IF NOT EXISTS idx_benefit_policy_status ON benefit_policies(status);
CREATE INDEX IF NOT EXISTS idx_benefit_policy_dates ON benefit_policies(start_date, end_date);

-- 2. BENEFIT POLICY RULES
CREATE TABLE IF NOT EXISTS benefit_policy_rules (
    id BIGSERIAL PRIMARY KEY,
    benefit_policy_id BIGINT NOT NULL,
    
    medical_category_id BIGINT,
    medical_service_id BIGINT,
    medical_package_id BIGINT, -- Added from V9005
    
    coverage_percent INTEGER,
    amount_limit DECIMAL(15, 2),
    times_limit INTEGER,
    
    waiting_period_days INTEGER DEFAULT 0,
    requires_pre_approval BOOLEAN NOT NULL DEFAULT FALSE,
    encounter_type VARCHAR(30),
    
    notes VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_rule_policy FOREIGN KEY (benefit_policy_id) REFERENCES benefit_policies(id) ON DELETE CASCADE,
    CONSTRAINT fk_rule_category FOREIGN KEY (medical_category_id) REFERENCES medical_categories(id),
    CONSTRAINT fk_rule_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id),
    CONSTRAINT fk_rule_package FOREIGN KEY (medical_package_id) REFERENCES medical_packages(id),
    
    -- Check constraints (Updated logic for package support)
    CONSTRAINT ck_bpr_target CHECK (
        (medical_category_id IS NOT NULL AND medical_service_id IS NULL AND medical_package_id IS NULL) OR
        (medical_service_id IS NOT NULL AND medical_category_id IS NULL AND medical_package_id IS NULL) OR
        (medical_package_id IS NOT NULL AND medical_category_id IS NULL AND medical_service_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_bpr_policy ON benefit_policy_rules(benefit_policy_id);
CREATE INDEX IF NOT EXISTS idx_bpr_category ON benefit_policy_rules(medical_category_id);
CREATE INDEX IF NOT EXISTS idx_bpr_service ON benefit_policy_rules(medical_service_id);
CREATE INDEX IF NOT EXISTS idx_bpr_package ON benefit_policy_rules(medical_package_id);
CREATE INDEX IF NOT EXISTS idx_bpr_active ON benefit_policy_rules(active);
CREATE INDEX IF NOT EXISTS idx_bpr_encounter_type ON benefit_policy_rules(encounter_type);

-- Consolidated partial unique indexes from V9005
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_service_rule ON benefit_policy_rules (benefit_policy_id, medical_service_id, encounter_type) 
WHERE medical_service_id IS NOT NULL AND encounter_type IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_service_rule_null_encounter ON benefit_policy_rules (benefit_policy_id, medical_service_id) 
WHERE medical_service_id IS NOT NULL AND encounter_type IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_category_rule ON benefit_policy_rules (benefit_policy_id, medical_category_id, encounter_type) 
WHERE medical_category_id IS NOT NULL AND encounter_type IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_category_rule_null_encounter ON benefit_policy_rules (benefit_policy_id, medical_category_id) 
WHERE medical_category_id IS NOT NULL AND encounter_type IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_package_rule ON benefit_policy_rules (benefit_policy_id, medical_package_id, encounter_type) 
WHERE medical_package_id IS NOT NULL AND encounter_type IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_package_rule_null_encounter ON benefit_policy_rules (benefit_policy_id, medical_package_id) 
WHERE medical_package_id IS NOT NULL AND encounter_type IS NULL;
