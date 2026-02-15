-- Enterprise Unified Dictionary Schema
-- Version: V53
-- Description: Core tables for the Unified Medical Dictionary and Provider Mapping Center

-- 1. Master Medical Services Table (UUID based)
CREATE TABLE IF NOT EXISTS ent_medical_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    sub_category VARCHAR(100),
    service_type VARCHAR(20) NOT NULL,
    is_master BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    version INTEGER NOT NULL DEFAULT 1,
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ent_medical_services_code ON ent_medical_services(code);
CREATE INDEX idx_ent_medical_services_search ON ent_medical_services(name_ar, name_en);

-- 2. Provider Raw Services (Incoming services from providers)
CREATE TABLE IF NOT EXISTS ent_provider_raw_services (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    raw_name VARCHAR(255) NOT NULL,
    raw_code VARCHAR(100) NOT NULL,
    mapped_service_id UUID REFERENCES ent_medical_services(id),
    mapping_status VARCHAR(20) NOT NULL DEFAULT 'UNMAPPED',
    confidence_score DOUBLE PRECISION,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, raw_code)
);

-- 3. Service Aliases (For better auto-mapping)
CREATE TABLE IF NOT EXISTS ent_service_aliases (
    id BIGSERIAL PRIMARY KEY,
    alias_text VARCHAR(255) NOT NULL,
    medical_service_id UUID NOT NULL REFERENCES ent_medical_services(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ent_service_aliases_text ON ent_service_aliases(alias_text);

-- 4. Mapping Audit & Governance
CREATE TABLE IF NOT EXISTS ent_service_mapping_audit (
    id BIGSERIAL PRIMARY KEY,
    provider_raw_service_id BIGINT NOT NULL REFERENCES ent_provider_raw_services(id),
    old_medical_service_id UUID REFERENCES ent_medical_services(id),
    new_medical_service_id UUID REFERENCES ent_medical_services(id),
    changed_by VARCHAR(100) NOT NULL,
    changed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

-- Sample Seed Data
INSERT INTO ent_medical_services (code, name_ar, name_en, service_type, category) 
VALUES ('SRV-LAB-CBC', 'تحليل دم شامل', 'Complete Blood Count (CBC)', 'LAB', 'Hematology');
