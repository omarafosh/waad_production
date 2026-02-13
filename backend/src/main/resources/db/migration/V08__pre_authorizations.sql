-- ═══════════════════════════════════════════════════════════════════════════
-- 08. Pre-Authorizations (Consolidated)
-- ═══════════════════════════════════════════════════════════════════════════
-- Sources: V1.09, V9010, V9024, V9025
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. PRE-AUTHORIZATIONS
CREATE TABLE pre_authorizations (
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
    service_type VARCHAR(20) DEFAULT 'MEDICAL',
    service_category_id BIGINT,
    
    -- Dates
    request_date DATE NOT NULL,
    expected_service_date DATE NOT NULL,
    expiry_date DATE,
    approved_at TIMESTAMP,
    
    -- Pricing
    contract_price DECIMAL(10, 2) NOT NULL,
    approved_amount DECIMAL(10, 2),
    copay_amount DECIMAL(10, 2) DEFAULT 0.00,
    copay_percentage DECIMAL(5, 2) DEFAULT 0.00,
    reserved_amount DECIMAL(10, 2) DEFAULT 0.00,
    insurance_covered_amount DECIMAL(10, 2),
    
    -- Status & Priority
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    priority VARCHAR(20) DEFAULT 'NORMAL',
    requires_pa BOOLEAN DEFAULT TRUE,
    
    -- Clinical Info
    diagnosis_code VARCHAR(20) NOT NULL DEFAULT 'Z00.0',
    diagnosis_description VARCHAR(500),
    
    -- Metadata
    notes VARCHAR(1000),
    rejection_reason VARCHAR(500),
    approved_by VARCHAR(100),
    currency VARCHAR(3) DEFAULT 'LYD',
    
    -- Status
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Universal Columns (V9001)
    version BIGINT DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Foreign Keys
    CONSTRAINT fk_preauth_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_preauth_provider FOREIGN KEY (provider_id) REFERENCES providers(id),
    CONSTRAINT fk_preauth_visit FOREIGN KEY (visit_id) REFERENCES visits(id),
    CONSTRAINT fk_preauth_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id),
    CONSTRAINT fk_preauth_category FOREIGN KEY (service_category_id) REFERENCES medical_categories(id)
);

CREATE INDEX idx_preauth_member ON pre_authorizations(member_id);
CREATE INDEX idx_preauth_provider ON pre_authorizations(provider_id);
CREATE INDEX idx_preauth_status ON pre_authorizations(status);
CREATE INDEX idx_preauth_visit ON pre_authorizations(visit_id);
CREATE INDEX idx_preauth_service ON pre_authorizations(medical_service_id);
CREATE INDEX idx_preauth_request_date ON pre_authorizations(request_date);
CREATE INDEX idx_preauth_number ON pre_authorizations(pre_auth_number);

-- 2. PRE-AUTHORIZATION ATTACHMENTS (V9010 + V9024)
CREATE TABLE pre_authorization_attachments (
    id BIGSERIAL PRIMARY KEY,
    pre_authorization_id BIGINT NOT NULL,
    
    file_name VARCHAR(500) NOT NULL,
    file_url VARCHAR(1000),
    file_type VARCHAR(100),
    file_key VARCHAR(500),
    original_file_name VARCHAR(500),
    file_size BIGINT,
    uploaded_by VARCHAR(100),
    attachment_type VARCHAR(50),
    
    -- Robust Fixes (V9024)
    file_path VARCHAR(500),
    stored_file_name VARCHAR(255),
    created_by VARCHAR(100),
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_preauth_attachment_preauth FOREIGN KEY (pre_authorization_id) REFERENCES pre_authorizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_preauth_attachments_preauth_id ON pre_authorization_attachments(pre_authorization_id);
CREATE INDEX idx_preauth_attachments_type ON pre_authorization_attachments(attachment_type);

-- 3. PRE-AUTHORIZATION AUDIT (V9010 + V9024 + V9025)
CREATE TABLE pre_authorization_audit (
    id BIGSERIAL PRIMARY KEY,
    pre_authorization_id BIGINT NOT NULL,
    action VARCHAR(100) NOT NULL, -- Fixed from V9024 to potentially bigger size if strictly V9010
    
    performed_by BIGINT,
    performed_by_username VARCHAR(100),
    
    -- Robust Fixes (V9024/V9025)
    details TEXT, -- old_value in V9010, renamed/typed to TEXT in V9025 logic? V9025 only changed type. V9024 added old/new value.
    -- Let's stick to V9024+V9025 schema
    old_value TEXT,
    new_value TEXT,
    
    change_date TIMESTAMP, -- V9024
    changed_by VARCHAR(100), -- V9024
    reference_number VARCHAR(50), -- V9024
    field_name VARCHAR(50), -- V9024
    notes VARCHAR(500), -- V9024
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_preauth_audit_preauth FOREIGN KEY (pre_authorization_id) REFERENCES pre_authorizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_preauth_audit_preauth_id ON pre_authorization_audit(pre_authorization_id);
CREATE INDEX idx_preauth_audit_action ON pre_authorization_audit(action);
CREATE INDEX idx_preauth_audit_created_at ON pre_authorization_audit(created_at DESC);

-- Trigger for updated_at (From V1.09)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_pre_authorizations_updated_at 
BEFORE UPDATE ON pre_authorizations 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
