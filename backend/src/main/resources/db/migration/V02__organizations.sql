-- ═══════════════════════════════════════════════════════════════════════════
-- 02. Organizations & Settings (Consolidated & Refined)
-- ═══════════════════════════════════════════════════════════════════════════
-- This file defines the core organizational structure.
-- Matches Organization.java and Company.java entities.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. ORGANIZATIONS (Matches Organization.java - For Employers/Insurers)
CREATE TABLE IF NOT EXISTS organizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    
    address VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(100),
    
    active BOOLEAN NOT NULL DEFAULT TRUE,
    archived BOOLEAN NOT NULL DEFAULT FALSE, -- Soft delete for employers
    
    -- Audit Columns
    version BIGINT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Soft Delete Support (SoftDeleteEntity.java)
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations(code);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(active);

-- 2. COMPANIES (Matches Company.java - System Settings Hub)
CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Branding & Identity
    logo_url TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    website VARCHAR(200),
    business_type VARCHAR(100),
    tax_number VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'LYD',
    
    -- Formatting & UI
    card_number_format VARCHAR(200),
    font_family VARCHAR(50) DEFAULT 'Tajawal',
    font_size INTEGER DEFAULT 12,
    barcode_prefix VARCHAR(20) DEFAULT 'WAAD',
    card_title_color VARCHAR(20) DEFAULT '#1890ff',
    
    -- System Formatting Settings
    date_calendar VARCHAR(20) DEFAULT 'gregory',
    month_format VARCHAR(20) DEFAULT 'numeric',
    number_system VARCHAR(20) DEFAULT 'latn',
    
    -- SLA Configuration
    claim_sla_days INTEGER NOT NULL DEFAULT 10,
    pre_approval_sla_days INTEGER NOT NULL DEFAULT 3,
    
    -- Audit Columns
    version BIGINT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(code);

-- 3. USER PERMITTED ORGANIZATIONS (RBAC Multi-tenancy)
CREATE TABLE IF NOT EXISTS user_permitted_organizations (
    user_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, organization_id),
    CONSTRAINT fk_upo_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_upo_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 4. COMPANY SETTINGS (Matches CompanySettings.java)
CREATE TABLE IF NOT EXISTS company_settings (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    employer_id BIGINT NOT NULL,
    
    -- Feature Toggles
    can_view_claims BOOLEAN NOT NULL DEFAULT FALSE,
    can_view_visits BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit_members BOOLEAN NOT NULL DEFAULT TRUE,
    can_download_attachments BOOLEAN NOT NULL DEFAULT TRUE,
    
    ui_visibility JSONB, -- For granular UI control
    
    -- Audit Columns
    version BIGINT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_cs_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_cs_employer FOREIGN KEY (employer_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT uk_company_employer_settings UNIQUE (company_id, employer_id)
);

CREATE INDEX IF NOT EXISTS idx_company_settings_employer ON company_settings(employer_id);

-- 5. PDF SETTINGS (Matches PdfCompanySettings.java)
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
    
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit Columns
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- 6. FEATURE FLAGS (Matches FeatureFlag.java)
CREATE TABLE IF NOT EXISTS feature_flags (
    id BIGSERIAL PRIMARY KEY,
    flag_key VARCHAR(100) UNIQUE NOT NULL,
    flag_name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    role_filters JSONB, -- Stores array of allowed roles
    
    -- Audit Columns
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- 7. MODULE ACCESS (Matches ModuleAccess.java)
CREATE TABLE IF NOT EXISTS module_access (
    id BIGSERIAL PRIMARY KEY,
    module_name VARCHAR(100) NOT NULL,
    module_key VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    allowed_roles JSONB NOT NULL,
    required_permissions JSONB,
    feature_flag_key VARCHAR(100),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit Columns
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. INITIAL DATA (Single Company Setup)
INSERT INTO companies (
    name, code, active, is_default, currency, barcode_prefix, 
    claim_sla_days, pre_approval_sla_days, 
    card_title_color, date_calendar, month_format, number_system
) 
VALUES (
    'Top Doctors TPA', 'TOP_DOCS', TRUE, TRUE, 'LYD', 'TD', 
    10, 3, 
    '#1890ff', 'gregory', 'numeric', 'latn'
) 
ON CONFLICT (code) DO NOTHING;
