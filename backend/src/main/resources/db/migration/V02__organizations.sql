-- ═══════════════════════════════════════════════════════════════════════════
-- 02. Organizations & Settings (Consolidated)
-- ═══════════════════════════════════════════════════════════════════════════
-- Sources: V1.02, V9010, V9022
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. ORGANIZATIONS (Unified Principal companies/Employers)
CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    
    -- Contact Info
    address VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(100),
    
    -- Status
    active BOOLEAN NOT NULL DEFAULT TRUE,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_organizations_code ON organizations(code);
COMMENT ON TABLE organizations IS 'Unified organizations table matching Organization.java entity';

-- 2. COMPANIES (System Settings Hub / Tenants)
CREATE TABLE companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Branding
    logo_url TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    website VARCHAR(200),
    business_type VARCHAR(100),
    tax_number VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'LYD',
    
    -- Settings
    card_number_format VARCHAR(200),
    font_family VARCHAR(50) DEFAULT 'Tajawal',
    font_size INTEGER DEFAULT 12,
    barcode_prefix VARCHAR(20) DEFAULT 'WAAD',
    
    -- SLA Configuration
    claim_sla_days INTEGER NOT NULL DEFAULT 10,
    pre_approval_sla_days INTEGER NOT NULL DEFAULT 3,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. USER_PERMITTED_ORGANIZATIONS
CREATE TABLE user_permitted_organizations (
    user_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, organization_id),
    CONSTRAINT fk_upo_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_upo_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 4. COMPANY SETTINGS (From V9010/V9022)
CREATE TABLE company_settings (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    employer_id BIGINT NOT NULL,
    can_view_claims BOOLEAN NOT NULL DEFAULT false,
    can_view_visits BOOLEAN NOT NULL DEFAULT false,
    can_edit_members BOOLEAN NOT NULL DEFAULT true,
    can_download_attachments BOOLEAN NOT NULL DEFAULT true,
    ui_visibility JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uk_company_employer_settings UNIQUE (company_id, employer_id)
);

CREATE INDEX idx_company_settings_employer ON company_settings(employer_id);
CREATE INDEX idx_company_settings_company ON company_settings(company_id);

-- 5. PDF SETTINGS (From V9010)
CREATE TABLE pdf_company_settings (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- 6. SYSTEM ADMIN (From V9010)
CREATE TABLE feature_flags (
    id BIGSERIAL PRIMARY KEY,
    flag_key VARCHAR(100) UNIQUE NOT NULL,
    flag_name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    role_filters JSON,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE module_access (
    id BIGSERIAL PRIMARY KEY,
    module_name VARCHAR(100) NOT NULL,
    module_key VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    allowed_roles JSON NOT NULL,
    required_permissions JSON,
    feature_flag_key VARCHAR(100),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. SEED DATA
-- Default TPA (Central Settings)
INSERT INTO companies (name, code, active, is_default, currency, barcode_prefix, claim_sla_days, pre_approval_sla_days) 
VALUES ('Top Doctors TPA', 'TOP_DOCS', true, true, 'LYD', 'TD', 10, 3) 
ON CONFLICT (code) DO NOTHING;
