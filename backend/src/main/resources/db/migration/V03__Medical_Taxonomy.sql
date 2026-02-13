-- ═══════════════════════════════════════════════════════════════════════════
-- V03: MEDICAL TAXONOMY (التصنيف الطبي)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. MEDICAL CATEGORIES (الفئات الطبية)
CREATE TABLE IF NOT EXISTS medical_categories (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    parent_id BIGINT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES medical_categories(id) ON DELETE SET NULL
);

-- 2. MEDICAL SERVICES (الخدمات الطبية)
CREATE TABLE IF NOT EXISTS medical_services (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    category_id BIGINT,
    base_price DECIMAL(15, 2),
    requires_pre_authorization BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_service_category FOREIGN KEY (category_id) REFERENCES medical_categories(id) ON DELETE SET NULL
);

-- 3. MEDICAL PACKAGES (الباقات الطبية)
CREATE TABLE IF NOT EXISTS medical_packages (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    package_price DECIMAL(15, 2),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- 4. PACKAGE SERVICES (خدمات الباقة)
CREATE TABLE IF NOT EXISTS medical_package_services (
    id BIGSERIAL PRIMARY KEY,
    package_id BIGINT NOT NULL,
    service_id BIGINT NOT NULL,
    quantity INTEGER DEFAULT 1,
    CONSTRAINT fk_mps_package FOREIGN KEY (package_id) REFERENCES medical_packages(id) ON DELETE CASCADE,
    CONSTRAINT fk_mps_service FOREIGN KEY (service_id) REFERENCES medical_services(id) ON DELETE CASCADE,
    CONSTRAINT uk_package_service UNIQUE (package_id, service_id)
);
