-- ═══════════════════════════════════════════════════════════════════════════
-- 06. Providers & Contracts (Consolidated)
-- ═══════════════════════════════════════════════════════════════════════════
-- Sources: V1.04, V9001, V9010, V9028, V9029, V9030, V9031
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. PROVIDERS
CREATE TABLE providers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    license_number VARCHAR(100) NOT NULL UNIQUE,
    provider_type VARCHAR(20) NOT NULL,
    
    -- Contact & Address
    phone VARCHAR(50),
    email VARCHAR(100),
    city VARCHAR(100),
    address VARCHAR(500),
    tax_number VARCHAR(50),
    
    -- Status
    active BOOLEAN NOT NULL DEFAULT TRUE,
    network_status VARCHAR(20),
    
    -- Global Access
    allow_all_employers BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Contract Dates (From V9031)
    contract_start_date DATE,
    contract_end_date DATE,
    default_discount_rate DECIMAL(5, 2),
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

CREATE INDEX idx_providers_type ON providers(provider_type);
CREATE INDEX idx_providers_license ON providers(license_number);
-- CREATE INDEX idx_providers_name_trgm ON providers USING gin (to_tsvector('english', name)); -- Optional if extension enabled

-- 2. PROVIDER DOCUMENTS
CREATE TABLE provider_documents (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    document_number VARCHAR(100),
    expiry_date DATE,
    notes VARCHAR(500),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prov_docs_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

-- 3. PROVIDER CONTRACTS
CREATE TABLE provider_contracts (
    id BIGSERIAL PRIMARY KEY,
    contract_code VARCHAR(50) NOT NULL UNIQUE,
    contract_number VARCHAR(100),
    provider_id BIGINT NOT NULL,
    employer_id BIGINT, -- Renamed from employer_org_id in V9029
    
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    pricing_model VARCHAR(20) NOT NULL DEFAULT 'DISCOUNT',
    
    -- Terms
    start_date DATE NOT NULL,
    end_date DATE,
    signed_date DATE,
    auto_renew BOOLEAN DEFAULT FALSE,
    payment_terms VARCHAR(100),
    currency VARCHAR(3) DEFAULT 'LYD',
    
    -- Pricing
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    discount_rate DECIMAL(5, 2),
    total_value DECIMAL(15, 2),
    
    -- Contact
    contact_person VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    notes VARCHAR(2000),
    
    -- Status
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Universal Columns (V9001)
    version BIGINT DEFAULT 0,
    valid_from TIMESTAMP,
    valid_to TIMESTAMP,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    CONSTRAINT fk_pc_provider FOREIGN KEY (provider_id) REFERENCES providers(id),
    CONSTRAINT fk_pc_employer_fixed FOREIGN KEY (employer_id) REFERENCES organizations(id)
);

CREATE INDEX idx_contracts_provider_id ON provider_contracts(provider_id);
CREATE INDEX idx_contracts_employer_id ON provider_contracts(employer_id);
CREATE INDEX idx_contracts_status ON provider_contracts(status);
CREATE INDEX idx_contracts_contract_code ON provider_contracts(contract_code);

-- 4. PROVIDER CONTRACT PRICING ITEMS
CREATE TABLE provider_contract_pricing_items (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL,
    
    -- Target (Category OR Service)
    medical_category_id BIGINT,
    medical_service_id BIGINT,
    
    -- Pricing
    pricing_type VARCHAR(20) NOT NULL DEFAULT 'DISCOUNT',
    discount_percent DECIMAL(5, 2),
    
    -- Fixed Price & Snapshot Caching (V9028)
    contract_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    base_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    
    -- Snapshot info
    service_name VARCHAR(255),
    service_code VARCHAR(50),
    category_name VARCHAR(255),
    quantity INTEGER DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'service',
    currency VARCHAR(3) DEFAULT 'LYD',
    
    -- Validity
    effective_from DATE,
    effective_to DATE,
    
    notes VARCHAR(2000),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Status
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_pcpi_contract FOREIGN KEY (contract_id) REFERENCES provider_contracts(id) ON DELETE CASCADE,
    CONSTRAINT fk_pcpi_category FOREIGN KEY (medical_category_id) REFERENCES medical_categories(id),
    CONSTRAINT fk_pcpi_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id)
);

CREATE INDEX idx_pcpi_contract ON provider_contract_pricing_items(contract_id);
CREATE INDEX idx_pcpi_category ON provider_contract_pricing_items(medical_category_id);
CREATE INDEX idx_pcpi_service ON provider_contract_pricing_items(medical_service_id);
CREATE INDEX idx_pricing_service_name ON provider_contract_pricing_items(service_name);
CREATE INDEX idx_pricing_active ON provider_contract_pricing_items(active);

-- 5. PROVIDER SERVICES (Junction - V9030)
CREATE TABLE provider_services (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_provider_service UNIQUE (provider_id, service_code),
    CONSTRAINT fk_provider_services_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

CREATE INDEX idx_provider_services_provider ON provider_services(provider_id);
CREATE INDEX idx_provider_services_code ON provider_services(service_code);

-- 6. PROVIDER ALLOWED EMPLOYERS (Network)
CREATE TABLE provider_allowed_employers (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    employer_id BIGINT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prov_allowed_emp_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    CONSTRAINT fk_prov_allowed_emp_employer FOREIGN KEY (employer_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 7. PROVIDER SERVICE MAPPINGS
CREATE TABLE provider_service_mappings (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    provider_service_code VARCHAR(100) NOT NULL,
    master_service_id BIGINT NOT NULL,
    mapping_confidence DOUBLE PRECISION,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_provider_service_mapping UNIQUE (provider_id, provider_service_code),
    CONSTRAINT fk_psm_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    CONSTRAINT fk_psm_master_service FOREIGN KEY (master_service_id) REFERENCES medical_services(id)
);

-- 8. REVIEWER COMPANIES
CREATE TABLE reviewer_companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    medical_director VARCHAR(255),
    phone VARCHAR(255),
    email VARCHAR(255),
    address VARCHAR(255),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
