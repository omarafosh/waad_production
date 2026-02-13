-- ═══════════════════════════════════════════════════════════════════════════
-- V04: PROVIDERS (مقدمو الخدمة)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. PROVIDERS (المزودون)
CREATE TABLE IF NOT EXISTS providers (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    type VARCHAR(50) NOT NULL CHECK (type IN ('HOSPITAL', 'CLINIC', 'PHARMACY', 'LAB', 'IMAGING', 'OTHER')),
    license_number VARCHAR(100),
    license_expiry_date DATE,
    email VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    area VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- 2. PROVIDER CONTRACTS (العقود)
CREATE TABLE IF NOT EXISTS provider_contracts (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    contract_number VARCHAR(100) UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE,
    pricing_model VARCHAR(50) DEFAULT 'FEE_FOR_SERVICE' CHECK (pricing_model IN ('FEE_FOR_SERVICE', 'CAPITATION', 'PACKAGE', 'DISCOUNT')),
    discount_percentage DECIMAL(5, 2),
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED')),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_contract_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

-- 3. CONTRACT PRICES (الأسعار)
CREATE TABLE IF NOT EXISTS provider_contract_prices (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL,
    medical_category_id BIGINT,
    medical_service_id BIGINT,
    agreed_price DECIMAL(15, 2) NOT NULL,
    effective_from DATE,
    effective_to DATE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_price_contract FOREIGN KEY (contract_id) REFERENCES provider_contracts(id) ON DELETE CASCADE,
    CONSTRAINT fk_price_category FOREIGN KEY (medical_category_id) REFERENCES medical_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_price_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id) ON DELETE CASCADE,
    CONSTRAINT ck_price_target CHECK (
        (medical_category_id IS NOT NULL AND medical_service_id IS NULL) OR
        (medical_service_id IS NOT NULL AND medical_category_id IS NULL)
    )
);
