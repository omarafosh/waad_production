-- ═══════════════════════════════════════════════════════════════════════════
-- V08: CLAIMS SYSTEM (نظام المطالبات)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. CLAIMS (المطالبات)
CREATE TABLE IF NOT EXISTS claims (
    id BIGSERIAL PRIMARY KEY,
    claim_number VARCHAR(100) UNIQUE,
    member_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    benefit_policy_id BIGINT,
    pre_authorization_id BIGINT,
    service_date DATE NOT NULL,
    submission_date DATE NOT NULL,
    encounter_type VARCHAR(50) CHECK (encounter_type IN ('OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'TELECONSULTATION', 'HOME_VISIT')),
    primary_diagnosis_code VARCHAR(50),
    primary_diagnosis_description TEXT,
    secondary_diagnosis_codes TEXT,
    total_claimed_amount DECIMAL(15, 2) NOT NULL,
    total_approved_amount DECIMAL(15, 2) DEFAULT 0,
    total_rejected_amount DECIMAL(15, 2) DEFAULT 0,
    deductible_amount DECIMAL(15, 2) DEFAULT 0,
    copay_amount DECIMAL(15, 2) DEFAULT 0,
    net_payable_amount DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'PAID', 'CANCELLED')),
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_claim_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT fk_claim_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    CONSTRAINT fk_claim_policy FOREIGN KEY (benefit_policy_id) REFERENCES benefit_policies(id) ON DELETE SET NULL,
    CONSTRAINT fk_claim_pa FOREIGN KEY (pre_authorization_id) REFERENCES pre_authorizations(id) ON DELETE SET NULL
);

-- 2. CLAIM LINES (التفاصيل)
CREATE TABLE IF NOT EXISTS claim_lines (
    id BIGSERIAL PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    medical_service_id BIGINT,
    medical_category_id BIGINT,
    service_code VARCHAR(50),
    service_description VARCHAR(500),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL,
    claimed_amount DECIMAL(15, 2) NOT NULL,
    approved_amount DECIMAL(15, 2) DEFAULT 0,
    rejected_amount DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED')),
    rejection_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_cl_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    CONSTRAINT fk_cl_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id) ON DELETE SET NULL,
    CONSTRAINT fk_cl_category FOREIGN KEY (medical_category_id) REFERENCES medical_categories(id) ON DELETE SET NULL
);

-- 3. ATTACHMENTS (المرفقات)
CREATE TABLE IF NOT EXISTS claim_attachments (
    id BIGSERIAL PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    description VARCHAR(500),
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(100),
    CONSTRAINT fk_ca_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);
