-- 1. Create Provider Raw Services Table
-- Stores the original/raw service codes as received from the provider
CREATE TABLE IF NOT EXISTS provider_raw_services (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    service_code VARCHAR(100) NOT NULL,
    service_name VARCHAR(255),
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_raw_provider FOREIGN KEY (provider_id) REFERENCES providers(id),
    CONSTRAINT uk_raw_provider_code UNIQUE (provider_id, service_code)
);

-- 2. Update Provider Service Mappings Table
-- Add Audit and Status fields
ALTER TABLE provider_service_mappings 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS reason_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION DEFAULT 1.0;

-- 3. Create Mapping Audit Log Table
-- Tracks history of mapping changes
CREATE TABLE IF NOT EXISTS mapping_audit_log (
    id BIGSERIAL PRIMARY KEY,
    mapping_id BIGINT NOT NULL,
    old_master_id BIGINT,
    new_master_id BIGINT,
    reason_code VARCHAR(50),
    changed_by VARCHAR(100),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index recommendations
CREATE INDEX IF NOT EXISTS idx_raw_service_code ON provider_raw_services(service_code);
CREATE INDEX IF NOT EXISTS idx_mapping_reason ON provider_service_mappings(reason_code);
