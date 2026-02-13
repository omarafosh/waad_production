-- ═══════════════════════════════════════════════════════════════════════════
-- V07: AUTHORIZATIONS (الموافقات المسبقة)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. PRE-AUTHORIZATIONS (الطلبات)
CREATE TABLE IF NOT EXISTS pre_authorizations (
    id BIGSERIAL PRIMARY KEY,
    authorization_number VARCHAR(100) UNIQUE,
    member_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    benefit_policy_id BIGINT,
    medical_service_id BIGINT,
    medical_category_id BIGINT,
    diagnosis_code VARCHAR(50),
    diagnosis_description TEXT,
    requested_date DATE NOT NULL,
    service_date DATE,
    estimated_cost DECIMAL(15, 2),
    approved_amount DECIMAL(15, 2),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'PARTIALLY_APPROVED')),
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    valid_from DATE,
    valid_to DATE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_pa_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT fk_pa_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    CONSTRAINT fk_pa_policy FOREIGN KEY (benefit_policy_id) REFERENCES benefit_policies(id) ON DELETE SET NULL,
    CONSTRAINT fk_pa_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id) ON DELETE SET NULL,
    CONSTRAINT fk_pa_category FOREIGN KEY (medical_category_id) REFERENCES medical_categories(id) ON DELETE SET NULL
);

-- 2. ATTACHMENTS (المرفقات)
CREATE TABLE IF NOT EXISTS pre_authorization_attachments (
    id BIGSERIAL PRIMARY KEY,
    pre_authorization_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    description VARCHAR(500),
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(100),
    CONSTRAINT fk_paa_pa FOREIGN KEY (pre_authorization_id) REFERENCES pre_authorizations(id) ON DELETE CASCADE
);
