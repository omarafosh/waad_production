-- 1. CLAIMS (Matches Claim.java)
CREATE TABLE IF NOT EXISTS claims (
    id BIGSERIAL PRIMARY KEY,
    
    visit_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    insurance_org_id BIGINT,
    provider_id BIGINT NOT NULL,
    pre_authorization_id BIGINT,
    
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING, UNDER_REVIEW, APPROVED, REJECTED, PARTIALLY_APPROVED, SETTLED, CANCELLED
    provider_name VARCHAR(255),
    doctor_name VARCHAR(255),
    service_date DATE,
    
    diagnosis_code VARCHAR(20),
    diagnosis_description VARCHAR(500),
    
    -- Financials
    requested_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    approved_amount DECIMAL(15, 2) DEFAULT 0.00,
    difference_amount DECIMAL(15, 2) DEFAULT 0.00,
    
    patient_copay DECIMAL(15, 2) DEFAULT 0.00,
    net_provider_amount DECIMAL(15, 2) DEFAULT 0.00,
    copay_percent DECIMAL(5, 2) DEFAULT 0.00,
    deductible_applied DECIMAL(15, 2) DEFAULT 0.00,
    
    -- SLA & Processing
    expected_completion_date DATE,
    actual_completion_date DATE,
    within_sla BOOLEAN,
    business_days_taken INTEGER,
    sla_days_configured INTEGER,
    
    -- Settlement Info
    payment_reference VARCHAR(100),
    settled_at TIMESTAMP,
    settlement_notes TEXT,
    
    -- Metadata
    service_count INTEGER DEFAULT 0,
    attachments_count INTEGER DEFAULT 0,
    reviewer_comment TEXT,
    reviewed_at TIMESTAMP,
    
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit & Versioning
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Soft Delete Support
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    
    CONSTRAINT fk_claim_visit FOREIGN KEY (visit_id) REFERENCES visits(id),
    CONSTRAINT fk_claim_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_claim_insurance FOREIGN KEY (insurance_org_id) REFERENCES organizations(id),
    CONSTRAINT fk_claim_provider FOREIGN KEY (provider_id) REFERENCES providers(id),
    CONSTRAINT fk_claim_preauth FOREIGN KEY (pre_authorization_id) REFERENCES pre_authorizations(id),
    CONSTRAINT chk_claim_status CHECK (status IN ('DRAFT', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PARTIALLY_APPROVED', 'SETTLED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_claims_visit ON claims(visit_id);
CREATE INDEX IF NOT EXISTS idx_claims_member ON claims(member_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_provider ON claims(provider_id);

-- 2. CLAIM LINES (Matches ClaimLine.java)
CREATE TABLE IF NOT EXISTS claim_lines (
    id BIGSERIAL PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    medical_service_id BIGINT NOT NULL,
    
    -- Service Snapshot
    service_code VARCHAR(50) NOT NULL,
    service_name VARCHAR(255),
    service_category_id BIGINT NOT NULL,
    service_category_name VARCHAR(200),
    
    -- Pricing
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    
    -- Status snapshots
    coverage_percent_snapshot INTEGER,
    patient_copay_percent_snapshot INTEGER,
    requires_pa BOOLEAN NOT NULL DEFAULT FALSE,
    
    provider_service_code VARCHAR(100),
    reclassification_reason_code VARCHAR(50),
    
    CONSTRAINT fk_cl_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    CONSTRAINT fk_cl_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id)
);

-- 3. CLAIM ATTACHMENTS (Matches ClaimAttachment.java)
CREATE TABLE IF NOT EXISTS claim_attachments (
    id BIGSERIAL PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_url VARCHAR(1000),
    file_type VARCHAR(100),
    file_key VARCHAR(500),
    original_file_name VARCHAR(500),
    file_size BIGINT,
    attachment_type VARCHAR(50),
    
    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(100),
    
    CONSTRAINT fk_claim_attachment_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

-- 4. CLAIM WORKFLOW (Standardized Audit)
CREATE TABLE IF NOT EXISTS claim_workflow_logs (
    id BIGSERIAL PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    action VARCHAR(100) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    performed_by VARCHAR(100),
    performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    CONSTRAINT fk_cwl_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);
