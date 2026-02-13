-- ═══════════════════════════════════════════════════════════════════════════
-- 03. Medical Coding & Taxonomy (Consolidated)
-- ═══════════════════════════════════════════════════════════════════════════
-- Sources: V1.03, V9005, V9010, V9022
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. MEDICAL CATEGORIES
CREATE TABLE medical_categories (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    parent_id BIGINT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES medical_categories(id)
);

CREATE INDEX idx_categories_parent ON medical_categories(parent_id);

-- 2. MEDICAL SERVICES
CREATE TABLE medical_services (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    category_id BIGINT,
    
    description VARCHAR(500),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    
    is_master BOOLEAN NOT NULL DEFAULT TRUE,
    requires_pa BOOLEAN DEFAULT TRUE,
    base_price DECIMAL(10, 2),
    
    -- Validity (From V9022)
    valid_from TIMESTAMP,
    valid_to TIMESTAMP,
    version BIGINT DEFAULT 0,
    
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_service_category FOREIGN KEY (category_id) REFERENCES medical_categories(id)
);

CREATE INDEX idx_services_category ON medical_services(category_id);
CREATE INDEX idx_services_name ON medical_services(name);

-- 3. MEDICAL PACKAGES
CREATE TABLE medical_packages (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    total_price DECIMAL(15, 2),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. MEDICAL PACKAGE ITEMS
CREATE TABLE medical_package_items (
    id BIGSERIAL PRIMARY KEY,
    package_id BIGINT NOT NULL,
    service_id BIGINT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(15, 2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_mpi_package FOREIGN KEY (package_id) REFERENCES medical_packages(id) ON DELETE CASCADE,
    CONSTRAINT fk_mpi_service FOREIGN KEY (service_id) REFERENCES medical_services(id)
);

-- 5. CPT CODES (From V9010)
CREATE TABLE cpt_codes (
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
    covered BOOLEAN NOT NULL DEFAULT true,
    co_payment_percentage DECIMAL(19, 2),
    requires_pre_auth BOOLEAN NOT NULL DEFAULT false,
    notes VARCHAR(2000),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. ICD CODES (From V9010)
CREATE TABLE icd_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    description_ar VARCHAR(500) NOT NULL,
    description_en VARCHAR(500) NOT NULL,
    category VARCHAR(50),
    sub_category VARCHAR(100),
    version VARCHAR(20),
    notes VARCHAR(2000),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. COVERAGE RULE CONFIG (From V9005)
CREATE TABLE coverage_rule_config (
    id SERIAL PRIMARY KEY,
    rule_key VARCHAR(100) NOT NULL UNIQUE,
    priority_weight INTEGER NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed default priorities
INSERT INTO coverage_rule_config (rule_key, priority_weight, description) VALUES
('SERVICE_ENCOUNTER_MATCH', 1000, 'Specific service rule with matching encounter type'),
('SERVICE_ANY_ENCOUNTER', 900, 'Specific service rule for any encounter type'),
('PACKAGE_ENCOUNTER_MATCH', 800, 'Package rule with matching encounter type'),
('PACKAGE_ANY_ENCOUNTER', 700, 'Package rule for any encounter type'),
('CATEGORY_ENCOUNTER_MATCH', 600, 'Category rule with matching encounter type'),
('CATEGORY_ANY_ENCOUNTER', 500, 'Category rule for any encounter type'),
('POLICY_DEFAULT', 100, 'Fall back to policy default')
ON CONFLICT (rule_key) DO NOTHING;
