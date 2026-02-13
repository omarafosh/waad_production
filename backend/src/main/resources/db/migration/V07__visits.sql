-- ═══════════════════════════════════════════════════════════════════════════
-- 07. Visits & Eligibility (Consolidated)
-- ═══════════════════════════════════════════════════════════════════════════
-- Sources: V1.07, V9001, V9010, V1.09
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. VISITS
CREATE TABLE visits (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    employer_org_id BIGINT,
    provider_id BIGINT NOT NULL, -- NOT NULL from V1.09
    
    visit_date DATE NOT NULL,
    visit_type VARCHAR(30) DEFAULT 'OUTPATIENT',
    status VARCHAR(30) DEFAULT 'REGISTERED',
    
    doctor_name VARCHAR(255),
    specialty VARCHAR(255),
    diagnosis VARCHAR(1000),
    treatment VARCHAR(1000),
    
    total_amount DECIMAL(15, 2),
    notes VARCHAR(1000),
    active BOOLEAN DEFAULT TRUE,
    
    eligibility_check_id BIGINT,
    
    -- Universal Columns (V9001)
    version BIGINT DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_visit_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_visit_employer FOREIGN KEY (employer_org_id) REFERENCES organizations(id),
    CONSTRAINT fk_visit_provider FOREIGN KEY (provider_id) REFERENCES providers(id) -- From V1.09
);

CREATE INDEX idx_visits_member ON visits(member_id);
CREATE INDEX idx_visits_date ON visits(visit_date);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_provider_date ON visits(provider_id, visit_date); -- From V1.09

-- 2. VISIT ATTACHMENTS (From V9010)
CREATE TABLE visit_attachments (
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
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_visit_attachment_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
);

CREATE INDEX idx_visit_attachments_visit_id ON visit_attachments(visit_id);
CREATE INDEX idx_visit_attachments_type ON visit_attachments(attachment_type);

-- 3. ELIGIBILITY CHECKS (From V9010)
CREATE TABLE eligibility_checks (
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
    
    -- Audit
    checked_by_user_id BIGINT,
    checked_by_username VARCHAR(100),
    company_scope_id BIGINT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    processing_time_ms INTEGER,
    rules_evaluated INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_eligibility_visit FOREIGN KEY (visit_id) REFERENCES visits(id)
);

CREATE INDEX idx_eligibility_request_id ON eligibility_checks(request_id);
CREATE INDEX idx_eligibility_member_id ON eligibility_checks(member_id);
CREATE INDEX idx_eligibility_policy_id ON eligibility_checks(policy_id);
