-- 1. PRE-AUTHORIZATIONS (Matches PreAuthorization.java)
CREATE TABLE IF NOT EXISTS pre_authorizations (
    id BIGSERIAL PRIMARY KEY,
    pre_auth_number VARCHAR(50) NOT NULL UNIQUE,
    reference_number VARCHAR(50),
    
    -- Core References
    member_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    visit_id BIGINT NOT NULL,
    
    -- Service Details
    medical_service_id BIGINT NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    service_name VARCHAR(255),
    service_type VARCHAR(20) DEFAULT 'MEDICAL', -- MEDICAL, DENTAL, OPTICAL, PHARMACY
    service_category_id BIGINT,
    
    -- Dates
    request_date DATE NOT NULL,
    expected_service_date DATE NOT NULL,
    expiry_date DATE,
    approved_at TIMESTAMP,
    
    -- Pricing
    contract_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    approved_amount DECIMAL(15, 2) DEFAULT 0.00,
    copay_amount DECIMAL(15, 2) DEFAULT 0.00,
    copay_percentage DECIMAL(5, 2) DEFAULT 0.00,
    reserved_amount DECIMAL(15, 2) DEFAULT 0.00,
    insurance_covered_amount DECIMAL(15, 2) DEFAULT 0.00,
    
    -- Status & Priority
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    priority VARCHAR(20) DEFAULT 'NORMAL',
    requires_pa BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Clinical Info
    diagnosis_code VARCHAR(20) NOT NULL DEFAULT 'Z00.0',
    diagnosis_description VARCHAR(500),
    
    -- Metadata
    notes VARCHAR(2000),
    rejection_reason VARCHAR(1000),
    approved_by VARCHAR(100),
    currency VARCHAR(3) DEFAULT 'LYD',
    
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
    
    -- Foreign Keys
    CONSTRAINT fk_preauth_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_preauth_provider FOREIGN KEY (provider_id) REFERENCES providers(id),
    CONSTRAINT fk_preauth_visit FOREIGN KEY (visit_id) REFERENCES visits(id),
    CONSTRAINT fk_preauth_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id),
    CONSTRAINT fk_preauth_category FOREIGN KEY (service_category_id) REFERENCES medical_categories(id),
    
    -- Enum Constraints
    CONSTRAINT chk_preauth_service_type CHECK (service_type IN ('MEDICAL', 'DENTAL', 'OPTICAL', 'PHARMACY', 'OTHER')),
    CONSTRAINT chk_preauth_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'IN_PROCESS')),
    CONSTRAINT chk_preauth_priority CHECK (priority IN ('NORMAL', 'URGENT', 'EMERGENCY'))
);

CREATE INDEX IF NOT EXISTS idx_preauth_member ON pre_authorizations(member_id);
CREATE INDEX IF NOT EXISTS idx_preauth_provider ON pre_authorizations(provider_id);
CREATE INDEX IF NOT EXISTS idx_preauth_status ON pre_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_preauth_number ON pre_authorizations(pre_auth_number);

-- 2. PRE-AUTHORIZATION ATTACHMENTS (Matches PreAuthorizationAttachment.java)
CREATE TABLE IF NOT EXISTS pre_authorization_attachments (
    id BIGSERIAL PRIMARY KEY,
    pre_authorization_id BIGINT NOT NULL,
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
    
    CONSTRAINT fk_preauth_attachment_preauth FOREIGN KEY (pre_authorization_id) REFERENCES pre_authorizations(id) ON DELETE CASCADE
);

-- 3. PRE-AUTHORIZATION WORKFLOW (Refined for Lifecycle Management)
CREATE TABLE IF NOT EXISTS pre_auth_workflow_logs (
    id BIGSERIAL PRIMARY KEY,
    pre_authorization_id BIGINT NOT NULL,
    action VARCHAR(100) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    performed_by VARCHAR(100),
    performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    CONSTRAINT fk_pawl_preauth FOREIGN KEY (pre_authorization_id) REFERENCES pre_authorizations(id) ON DELETE CASCADE
);
