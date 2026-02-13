-- ═══════════════════════════════════════════════════════════════════════════
-- V06: BENEFIT POLICIES (سياسات المنافع)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. POLICIES (السياسات)
CREATE TABLE IF NOT EXISTS benefit_policies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    policy_number VARCHAR(100) UNIQUE,
    employer_id BIGINT,
    annual_limit DECIMAL(15, 2),
    distribution_type VARCHAR(20) DEFAULT 'UNIFIED' CHECK (distribution_type IN ('UNIFIED', 'DISTRIBUTED')),
    deductible_amount DECIMAL(15, 2) DEFAULT 0,
    copay_percentage DECIMAL(5, 2) DEFAULT 0,
    copay_fixed_amount DECIMAL(15, 2) DEFAULT 0,
    effective_from DATE,
    effective_to DATE,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'TERMINATED', 'CANCELLED', 'INACTIVE', 'ARCHIVED')),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_policy_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE SET NULL
);

-- 2. RULES (القواعد)
CREATE TABLE IF NOT EXISTS benefit_policy_rules (
    id BIGSERIAL PRIMARY KEY,
    benefit_policy_id BIGINT NOT NULL,
    apply_on VARCHAR(20) CHECK (apply_on IN ('SERVICE', 'CATEGORY', 'PACKAGE')),
    medical_service_id BIGINT,
    medical_category_id BIGINT,
    medical_package_id BIGINT,
    encounter_type VARCHAR(50) CHECK (encounter_type IN ('OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'TELECONSULTATION', 'HOME_VISIT')),
    coverage_percentage DECIMAL(5, 2),
    max_sessions INTEGER,
    waiting_period_days INTEGER DEFAULT 0,
    requires_pre_authorization BOOLEAN DEFAULT FALSE,
    label VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_rule_policy FOREIGN KEY (benefit_policy_id) REFERENCES benefit_policies(id) ON DELETE CASCADE,
    CONSTRAINT fk_rule_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id) ON DELETE CASCADE,
    CONSTRAINT fk_rule_category FOREIGN KEY (medical_category_id) REFERENCES medical_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_rule_package FOREIGN KEY (medical_package_id) REFERENCES medical_packages(id) ON DELETE CASCADE
);

-- 3. DISTRIBUTIONS (التوزيعات)
CREATE TABLE IF NOT EXISTS coverage_distributions (
    id BIGSERIAL PRIMARY KEY,
    benefit_policy_id BIGINT NOT NULL,
    medical_category_id BIGINT,
    medical_service_id BIGINT,
    limit_amount DECIMAL(15, 2) NOT NULL CHECK (limit_amount >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_dist_policy FOREIGN KEY (benefit_policy_id) REFERENCES benefit_policies(id) ON DELETE CASCADE
);

-- 4. MEMBER ASSIGNMENTS (ربط الأعضاء)
CREATE TABLE IF NOT EXISTS member_policies (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    benefit_policy_id BIGINT NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_mp_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT fk_mp_policy FOREIGN KEY (benefit_policy_id) REFERENCES benefit_policies(id) ON DELETE CASCADE,
    CONSTRAINT uk_member_policy UNIQUE (member_id, benefit_policy_id)
);
