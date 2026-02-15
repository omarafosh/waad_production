-- 1. VISITS (Matches Visit.java)
CREATE TABLE IF NOT EXISTS visits (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    employer_org_id BIGINT,
    provider_id BIGINT NOT NULL,
    
    visit_date DATE NOT NULL,
    visit_type VARCHAR(30) DEFAULT 'OUTPATIENT',
    status VARCHAR(30) DEFAULT 'REGISTERED',
    
    doctor_name VARCHAR(255),
    specialty VARCHAR(255),
    diagnosis VARCHAR(1000),
    treatment VARCHAR(1000),
    
    total_amount DECIMAL(15, 2),
    notes VARCHAR(1000),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    eligibility_check_id BIGINT,
    
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
    
    CONSTRAINT fk_visit_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_visit_employer FOREIGN KEY (employer_org_id) REFERENCES organizations(id),
    CONSTRAINT fk_visit_provider FOREIGN KEY (provider_id) REFERENCES providers(id),
    CONSTRAINT chk_visit_type CHECK (visit_type IN ('OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'DENTAL', 'OPTICAL', 'PHARMACY')),
    CONSTRAINT chk_visit_status CHECK (status IN ('REGISTERED', 'PENDING_AUTHORIZATION', 'AUTHORIZED', 'REJECTED', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_visits_member ON visits(member_id);
CREATE INDEX IF NOT EXISTS idx_visits_provider_date ON visits(provider_id, visit_date);

-- 2. VISIT ATTACHMENTS (Matches VisitAttachment.java)
CREATE TABLE IF NOT EXISTS visit_attachments (
    id BIGSERIAL PRIMARY KEY,
    visit_id BIGINT NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_url VARCHAR(1000),
    file_type VARCHAR(100),
    file_key VARCHAR(500),
    original_file_name VARCHAR(500),
    file_size BIGINT,
    uploaded_by VARCHAR(100),
    attachment_type VARCHAR(50),
    
    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_visit_attachment_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
);

-- 3. ELIGIBILITY CHECKS (Matches EligibilityCheck.java)
CREATE TABLE IF NOT EXISTS eligibility_checks (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(36) UNIQUE NOT NULL,
    check_timestamp TIMESTAMP NOT NULL,
    member_id BIGINT NOT NULL,
    policy_id BIGINT,
    provider_id BIGINT,
    service_date DATE NOT NULL,
    service_code VARCHAR(50),
    visit_id BIGINT,
    
    eligible BOOLEAN NOT NULL,
    status VARCHAR(50) NOT NULL,
    reasons TEXT,
    
    -- Snapshot data
    member_name VARCHAR(255),
    member_civil_id VARCHAR(50),
    member_status VARCHAR(30),
    policy_number VARCHAR(100),
    policy_status VARCHAR(30),
    policy_start_date DATE,
    policy_end_date DATE,
    employer_id BIGINT,
    employer_name VARCHAR(255),
    
    -- Context Info
    checked_by_user_id BIGINT,
    checked_by_username VARCHAR(100),
    company_scope_id BIGINT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    processing_time_ms INTEGER,
    rules_evaluated INTEGER,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_eligibility_visit FOREIGN KEY (visit_id) REFERENCES visits(id),
    CONSTRAINT chk_eligibility_status CHECK (status IN ('COMPLETED', 'ERROR', 'PENDING'))
);

CREATE INDEX IF NOT EXISTS idx_eligibility_request_id ON eligibility_checks(request_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_member ON eligibility_checks(member_id);
