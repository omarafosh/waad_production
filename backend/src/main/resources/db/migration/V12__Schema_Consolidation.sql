-- ═══════════════════════════════════════════════════════════════════════════
-- V12: SCHEMA CONSOLIDATION & FUTURE DELTAS
-- ═══════════════════════════════════════════════════════════════════════════
-- ملاحظة: تم دمج كافة الجداول الأساسية في ملفات التأسيس (V01 - V11).
-- هذا الملف مخصص لأي تغييرات مستقبلية أو مزامنة إضافية فقط.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. MISSING SEQUENCES (Ensuring existence)
CREATE SEQUENCE IF NOT EXISTS seq_smart_card_random_id START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS member_barcode_seq START WITH 2000000 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS member_card_number_seq START WITH 1000000 INCREMENT BY 1;

-- 2. ENTERPRISE MAPPING CENTER (Consolidated from patches)
-- This section ensures all mapping tables exist with correct types and dependencies.

-- Unified Raw Services (Depends on medical_services in V03)
CREATE TABLE IF NOT EXISTS ent_provider_raw_services (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    raw_name VARCHAR(255) NOT NULL,
    raw_code VARCHAR(100) NOT NULL,
    mapped_service_id BIGINT REFERENCES medical_services(id),
    mapping_status VARCHAR(20) NOT NULL DEFAULT 'UNMAPPED',
    confidence_score DOUBLE PRECISION,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, raw_code)
);

-- Junction Table: Provider Service Mappings (Depends on providers in V06 and medical_services in V03)
CREATE TABLE IF NOT EXISTS provider_service_mappings (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    provider_service_code VARCHAR(100) NOT NULL,
    master_service_id BIGINT NOT NULL,
    mapping_confidence DOUBLE PRECISION,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    reason_code VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    
    CONSTRAINT fk_psm_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    CONSTRAINT fk_psm_master_service FOREIGN KEY (master_service_id) REFERENCES medical_services(id),
    CONSTRAINT uk_psm_provider_service UNIQUE (provider_id, provider_service_code)
);

CREATE INDEX IF NOT EXISTS idx_psm_provider ON provider_service_mappings(provider_id);
CREATE INDEX IF NOT EXISTS idx_psm_master ON provider_service_mappings(master_service_id);

-- Mapping Audit & Governance (Depends on ent_provider_raw_services and medical_services)
CREATE TABLE IF NOT EXISTS ent_service_mapping_audit (
    id BIGSERIAL PRIMARY KEY,
    provider_raw_service_id BIGINT NOT NULL REFERENCES ent_provider_raw_services(id),
    old_medical_service_id BIGINT REFERENCES medical_services(id),
    new_medical_service_id BIGINT REFERENCES medical_services(id),
    changed_by VARCHAR(100) NOT NULL,
    changed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

