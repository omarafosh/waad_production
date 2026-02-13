-- ═══════════════════════════════════════════════════════════════════════════
-- V20: Create All Remaining Missing Tables (Final Sweep)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Visit Attachments
CREATE TABLE IF NOT EXISTS visit_attachments (
    id BIGSERIAL PRIMARY KEY,
    visit_id BIGINT NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    original_file_name VARCHAR(500),
    file_key VARCHAR(500),
    file_type VARCHAR(100),
    file_size BIGINT,
    attachment_type VARCHAR(50),
    description VARCHAR(1000),
    uploaded_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visit_attachments_visit_id ON visit_attachments(visit_id);


-- 2. Reviewer Companies (Deprecated but Entity exists)
CREATE TABLE IF NOT EXISTS reviewer_companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    medical_director VARCHAR(255),
    phone VARCHAR(255),
    email VARCHAR(255),
    address VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);


-- 3. PreAuthorization Audit
CREATE TABLE IF NOT EXISTS pre_authorization_audit (
    id BIGSERIAL PRIMARY KEY,
    pre_authorization_id BIGINT NOT NULL,
    reference_number VARCHAR(50),
    changed_by VARCHAR(100) NOT NULL,
    change_date TIMESTAMP NOT NULL DEFAULT NOW(),
    action VARCHAR(20) NOT NULL,
    field_name VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    notes VARCHAR(500),
    ip_address VARCHAR(45)
);
CREATE INDEX IF NOT EXISTS idx_audit_preauth ON pre_authorization_audit(pre_authorization_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON pre_authorization_audit(change_date);


-- 4. PDF Company Settings
CREATE TABLE IF NOT EXISTS pdf_company_settings (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(512),
    logo_data BYTEA,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(255),
    footer_text TEXT,
    footer_text_en TEXT,
    header_color VARCHAR(7),
    footer_color VARCHAR(7),
    page_size VARCHAR(20),
    margin_top INTEGER,
    margin_bottom INTEGER,
    margin_left INTEGER,
    margin_right INTEGER,
    is_active BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);


-- 5. Reclassification Audit
CREATE TABLE IF NOT EXISTS reclassification_audits (
    id BIGSERIAL PRIMARY KEY,
    service_id BIGINT NOT NULL,
    old_category_id BIGINT,
    new_category_id BIGINT NOT NULL,
    strategy VARCHAR(30) NOT NULL,
    reason_code VARCHAR(100),
    rules_affected INTEGER,
    performed_by VARCHAR(100),
    correlation_id VARCHAR(36),
    before_snapshot TEXT,
    after_snapshot TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);


-- 6. Member Import Errors
CREATE TABLE IF NOT EXISTS member_import_errors (
    id BIGSERIAL PRIMARY KEY,
    import_log_id BIGINT NOT NULL,
    row_number INTEGER NOT NULL,
    row_data JSONB, -- Requires PostgreSQL JSONB support
    error_type VARCHAR(50),
    error_field VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMP
);
-- FK for member_import_errors
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_member_import_errors_log') THEN
        ALTER TABLE member_import_errors
        ADD CONSTRAINT fk_member_import_errors_log
        FOREIGN KEY (import_log_id)
        REFERENCES member_import_logs(id)
        ON DELETE CASCADE;
    END IF;
END $$;


-- 7. Member Documents
CREATE TABLE IF NOT EXISTS member_documents (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    document_type VARCHAR(255) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_name VARCHAR(255),
    mime_type VARCHAR(255),
    file_size BIGINT,
    uploaded_at TIMESTAMP NOT NULL,
    uploaded_by VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    verified_by VARCHAR(255),
    notes VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_member_documents_member ON member_documents(member_id);


-- 8. Coverage Rule Config (Ensure existence if V16 failed to alter it because it didn't exist)
CREATE TABLE IF NOT EXISTS coverage_rule_config (
    id BIGSERIAL PRIMARY KEY,
    rule_key VARCHAR(255) NOT NULL UNIQUE,
    priority_weight INTEGER NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Note: V16 tried to ALTER 'id' type. If table didn't exist, this CREATE handles it with BIGSERIAL directly.
-- If table existed with SERIAL, V16 handles the ALTER.
