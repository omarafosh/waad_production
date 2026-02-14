-- ═══════════════════════════════════════════════════════════════════════════
-- 09. Claims (Consolidated)
-- ═══════════════════════════════════════════════════════════════════════════
-- Sources: V1.07, V9001, V9010, V1.09
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. CLAIMS
CREATE TABLE IF NOT EXISTS claims (
    id BIGSERIAL PRIMARY KEY,
    
    visit_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    insurance_org_id BIGINT,
    provider_id BIGINT NOT NULL,
    pre_authorization_id BIGINT, -- Linked in V1.09
    
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    provider_name VARCHAR(255),
    doctor_name VARCHAR(255),
    service_date DATE,
    
    diagnosis_code VARCHAR(20),
    diagnosis_description VARCHAR(500),
    
    -- Financials
    requested_amount DECIMAL(15, 2) NOT NULL,
    approved_amount DECIMAL(15, 2),
    difference_amount DECIMAL(15, 2),
    
    patient_copay DECIMAL(15, 2),
    net_provider_amount DECIMAL(15, 2),
    copay_percent DECIMAL(5, 2),
    deductible_applied DECIMAL(15, 2),
    
    -- SLA & Processing
    expected_completion_date DATE,
    actual_completion_date DATE,
    within_sla BOOLEAN,
    business_days_taken INTEGER,
    sla_days_configured INTEGER,
    
    -- Settlement
    payment_reference VARCHAR(100),
    settled_at TIMESTAMP,
    settlement_notes TEXT,
    
    -- Metadata
    service_count INTEGER DEFAULT 0,
    attachments_count INTEGER DEFAULT 0,
    reviewer_comment TEXT,
    reviewed_at TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Universal Columns (V9001)
    version BIGINT DEFAULT 0,
    valid_from TIMESTAMP,
    valid_to TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    CONSTRAINT fk_claim_visit FOREIGN KEY (visit_id) REFERENCES visits(id),
    CONSTRAINT fk_claim_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_claim_insurance FOREIGN KEY (insurance_org_id) REFERENCES organizations(id),
    CONSTRAINT fk_claim_provider FOREIGN KEY (provider_id) REFERENCES providers(id),
    CONSTRAINT fk_claim_preauth FOREIGN KEY (pre_authorization_id) REFERENCES pre_authorizations(id) -- From V1.09
);

CREATE INDEX IF NOT EXISTS idx_claims_visit ON claims(visit_id);
CREATE INDEX IF NOT EXISTS idx_claims_member ON claims(member_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_provider ON claims(provider_id);
CREATE INDEX IF NOT EXISTS idx_claims_service_date_active ON claims(service_date, active) WHERE active = TRUE; -- From V1.09
CREATE INDEX IF NOT EXISTS idx_claims_financial ON claims(insurance_org_id, status, service_date, approved_amount); -- From V1.09

-- 2. CLAIM LINES
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
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    
    -- Snapshots
    coverage_percent_snapshot INTEGER,
    patient_copay_percent_snapshot INTEGER,
    requires_pa BOOLEAN DEFAULT FALSE,
    
    -- Provider Info
    provider_service_code VARCHAR(100),
    reclassification_reason_code VARCHAR(50),
    
    CONSTRAINT fk_cl_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    CONSTRAINT fk_cl_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id)
);

CREATE INDEX IF NOT EXISTS idx_cl_claim ON claim_lines(claim_id);
CREATE INDEX IF NOT EXISTS idx_cl_service ON claim_lines(medical_service_id);

-- 3. CLAIM ATTACHMENTS (From V9010)
CREATE TABLE IF NOT EXISTS claim_attachments (
    id BIGSERIAL PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_url VARCHAR(1000),
    file_type VARCHAR(100),
    file_key VARCHAR(500),
    original_file_name VARCHAR(500),
    file_size BIGINT,
    uploaded_by VARCHAR(100),
    attachment_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_claim_attachment_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_claim_attachments_claim_id ON claim_attachments(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_attachments_type ON claim_attachments(attachment_type);

-- 4. CLAIM AUDIT LOGS (From V9010)
CREATE TABLE IF NOT EXISTS claim_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    previous_requested_amount DECIMAL(15, 2),
    new_requested_amount DECIMAL(15, 2),
    previous_approved_amount DECIMAL(15, 2),
    new_approved_amount DECIMAL(15, 2),
    actor_user_id BIGINT NOT NULL,
    actor_username VARCHAR(100) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    comment TEXT,
    ip_address VARCHAR(45),
    before_snapshot TEXT,
    after_snapshot TEXT,
    CONSTRAINT fk_claim_audit_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_claim_audit_claim_id ON claim_audit_logs(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_audit_timestamp ON claim_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_claim_audit_actor ON claim_audit_logs(actor_user_id);
