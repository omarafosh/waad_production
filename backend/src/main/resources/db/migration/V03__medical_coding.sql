-- ═══════════════════════════════════════════════════════════════════════════
-- 03. Medical Coding & Taxonomy (Consolidated)
-- ═══════════════════════════════════════════════════════════════════════════
-- Sources: V1.03, V9005, V9010, V9022
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. MEDICAL CATEGORIES
CREATE TABLE IF NOT EXISTS medical_categories (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    parent_id BIGINT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit & Versioning
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Soft Delete
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES medical_categories(id)
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON medical_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON medical_categories(active);

-- 2. MEDICAL SERVICES
CREATE TABLE IF NOT EXISTS medical_services (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    category_id BIGINT,
    
    description VARCHAR(500),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    
    is_master BOOLEAN NOT NULL DEFAULT TRUE,
    requires_pa BOOLEAN NOT NULL DEFAULT TRUE,
    base_price DECIMAL(15, 2) DEFAULT 0.00,
    
    -- Validity
    valid_from TIMESTAMP,
    valid_to TIMESTAMP,
    
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit & Versioning
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Soft Delete
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    
    CONSTRAINT fk_service_category FOREIGN KEY (category_id) REFERENCES medical_categories(id)
);

CREATE INDEX IF NOT EXISTS idx_services_category ON medical_services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON medical_services(active);

-- 3. MEDICAL PACKAGES
CREATE TABLE IF NOT EXISTS medical_packages (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    total_price DECIMAL(15, 2) DEFAULT 0.00,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit & Versioning
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Soft Delete
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100)
);

-- 4. MEDICAL PACKAGE ITEMS
CREATE TABLE IF NOT EXISTS medical_package_items (
    id BIGSERIAL PRIMARY KEY,
    package_id BIGINT NOT NULL,
    service_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(15, 2) DEFAULT 0.00,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_mpi_package FOREIGN KEY (package_id) REFERENCES medical_packages(id) ON DELETE CASCADE,
    CONSTRAINT fk_mpi_service FOREIGN KEY (service_id) REFERENCES medical_services(id)
);

-- 5. CPT CODES
CREATE TABLE IF NOT EXISTS cpt_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    description_ar VARCHAR(500) NOT NULL,
    description_en VARCHAR(500) NOT NULL,
    category VARCHAR(100),
    sub_category VARCHAR(100),
    procedure_type VARCHAR(20),
    standard_price DECIMAL(19, 2),
    max_allowed_price DECIMAL(19, 2),
    min_allowed_price DECIMAL(19, 2),
    covered BOOLEAN NOT NULL DEFAULT TRUE,
    co_payment_percentage DECIMAL(19, 2),
    requires_pre_auth BOOLEAN NOT NULL DEFAULT FALSE,
    notes VARCHAR(2000),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. ICD CODES
CREATE TABLE IF NOT EXISTS icd_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    description_ar VARCHAR(500) NOT NULL,
    description_en VARCHAR(500) NOT NULL,
    category VARCHAR(50),
    sub_category VARCHAR(100),
    version VARCHAR(20),
    notes VARCHAR(2000),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. COVERAGE RULE CONFIG
CREATE TABLE IF NOT EXISTS coverage_rule_config (
    id SERIAL PRIMARY KEY,
    rule_key VARCHAR(100) NOT NULL UNIQUE,
    priority_weight INTEGER NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default priorities
-- 8. ENTERPRISE UNIFIED DICTIONARY
-- Core tables for the Unified Medical Dictionary and Provider Mapping Center

CREATE TABLE IF NOT EXISTS ent_medical_services (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    sub_category VARCHAR(100),
    specialty VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_master BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ent_medical_services_code ON ent_medical_services(code);
CREATE INDEX IF NOT EXISTS idx_ent_medical_services_search ON ent_medical_services(name_ar, name_en);

-- 10. Service Aliases (For better auto-mapping)
CREATE TABLE IF NOT EXISTS ent_service_aliases (
    id BIGSERIAL PRIMARY KEY,
    alias_text VARCHAR(255) NOT NULL,
    medical_service_id BIGINT NOT NULL REFERENCES ent_medical_services(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ent_service_aliases_text ON ent_service_aliases(alias_text);

-- Seed basic data
INSERT INTO ent_medical_services (code, name_ar, name_en, category) 
VALUES ('SRV-LAB-CBC', 'تحليل دم شامل', 'Complete Blood Count (CBC)', 'LAB')
ON CONFLICT (code) DO NOTHING;
