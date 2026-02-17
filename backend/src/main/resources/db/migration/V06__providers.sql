-- 1. PROVIDERS (Matches Provider.java)
CREATE TABLE IF NOT EXISTS providers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    license_number VARCHAR(100) NOT NULL UNIQUE,
    provider_type VARCHAR(20) NOT NULL, -- HOSPITAL, CLINIC, PHARMACY, etc.
    
    -- Contact & Address
    phone VARCHAR(50),
    email VARCHAR(100),
    city VARCHAR(100),
    address VARCHAR(500),
    tax_number VARCHAR(50),
    
    -- Status
    active BOOLEAN NOT NULL DEFAULT TRUE,
    network_status VARCHAR(20) DEFAULT 'IN_NETWORK', -- IN_NETWORK, OUT_OF_NETWORK, SUSPENDED
    
    -- Global Access
    allow_all_employers BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Contract Summary Info
    contract_start_date DATE,
    contract_end_date DATE,
    default_discount_rate DECIMAL(5, 2),
    
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
    
    CONSTRAINT chk_provider_type CHECK (provider_type IN ('HOSPITAL', 'CLINIC', 'PHARMACY', 'LABORATORY', 'RADIOLOGY', 'OPTICAL', 'DENTAL', 'OTHER')),
    CONSTRAINT chk_provider_network_status CHECK (network_status IN ('IN_NETWORK', 'OUT_OF_NETWORK', 'SUSPENDED'))
);

CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_providers_license ON providers(license_number);

-- 2. PROVIDER DOCUMENTS (Matches ProviderDocument.java)
CREATE TABLE IF NOT EXISTS provider_documents (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    document_number VARCHAR(100),
    expiry_date DATE,
    notes VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    CONSTRAINT fk_prov_docs_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

-- 3. PROVIDER CONTRACTS (Matches ProviderContract.java)
CREATE TABLE IF NOT EXISTS provider_contracts (
    id BIGSERIAL PRIMARY KEY,
    contract_code VARCHAR(50) NOT NULL UNIQUE,
    contract_number VARCHAR(100),
    provider_id BIGINT NOT NULL,
    employer_id BIGINT, -- Links to organizations(id)
    
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, ACTIVE, EXPIRED, TERMINATED
    pricing_model VARCHAR(20) NOT NULL DEFAULT 'DISCOUNT', -- DISCOUNT, FIXED_PRICE, CAPITATION
    
    -- Terms
    start_date DATE NOT NULL,
    end_date DATE,
    signed_date DATE,
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
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
    
    -- Audit & Versioning
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    CONSTRAINT fk_pc_provider FOREIGN KEY (provider_id) REFERENCES providers(id),
    CONSTRAINT fk_pc_employer FOREIGN KEY (employer_id) REFERENCES organizations(id),
    CONSTRAINT chk_contract_status CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'SUSPENDED')),
    CONSTRAINT chk_contract_pricing_model CHECK (pricing_model IN ('DISCOUNT', 'FIXED_PRICE', 'CAPITATION'))
);

CREATE INDEX IF NOT EXISTS idx_contracts_provider ON provider_contracts(provider_id);
CREATE INDEX IF NOT EXISTS idx_contracts_employer ON provider_contracts(employer_id);

-- 4. PROVIDER CONTRACT PRICING ITEMS (Matches ProviderContractPricingItem.java)
CREATE TABLE IF NOT EXISTS provider_contract_pricing_items (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL,
    
    -- Target (Category OR Service)
    medical_category_id BIGINT,
    medical_service_id BIGINT, -- Points to ent_medical_services(id)
    
    -- Pricing
    pricing_type VARCHAR(20) NOT NULL DEFAULT 'DISCOUNT',
    discount_percent DECIMAL(5, 2),
    contract_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    base_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    
    -- Snapshots
    service_name VARCHAR(255),
    service_code VARCHAR(50),
    category_name VARCHAR(255),
    specialty VARCHAR(100),
    
    -- Validity
    effective_from DATE,
    effective_to DATE,
    
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    CONSTRAINT fk_pcpi_contract FOREIGN KEY (contract_id) REFERENCES provider_contracts(id) ON DELETE CASCADE,
    CONSTRAINT fk_pcpi_category FOREIGN KEY (medical_category_id) REFERENCES medical_categories(id),
    CONSTRAINT fk_pcpi_enterprise_service FOREIGN KEY (medical_service_id) REFERENCES ent_medical_services(id) ON DELETE SET NULL,
    CONSTRAINT chk_pcpi_pricing_type CHECK (pricing_type IN ('DISCOUNT', 'FIXED_PRICE'))
);

-- 5. PROVIDER SERVICES (Junction)
CREATE TABLE IF NOT EXISTS provider_services (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uk_provider_service UNIQUE (provider_id, service_code),
    CONSTRAINT fk_provider_services_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

-- 6. PROVIDER ALLOWED EMPLOYERS (Network Restriction)
CREATE TABLE IF NOT EXISTS provider_allowed_employers (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    employer_id BIGINT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    CONSTRAINT fk_pae_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    CONSTRAINT fk_pae_employer FOREIGN KEY (employer_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT uk_provider_allowed_employer UNIQUE (provider_id, employer_id)
);

-- 7. REVIEWER COMPANIES
CREATE TABLE IF NOT EXISTS reviewer_companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    medical_director VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- 8. PROVIDER RAW SERVICES (For Mapping Core)
CREATE TABLE IF NOT EXISTS provider_raw_services (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    service_code VARCHAR(100) NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(255),
    specialty VARCHAR(255),
    is_mapped BOOLEAN NOT NULL DEFAULT FALSE,
    medical_service_code VARCHAR(100),
    mapped_at TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_raw_services_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    CONSTRAINT uk_raw_services_provider_code UNIQUE (provider_id, service_code)
);

CREATE INDEX IF NOT EXISTS idx_raw_services_mapped ON provider_raw_services(is_mapped);
CREATE INDEX IF NOT EXISTS idx_raw_services_provider_mapped ON provider_raw_services(provider_id, is_mapped);
