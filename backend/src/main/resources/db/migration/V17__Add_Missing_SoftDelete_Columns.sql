-- ═══════════════════════════════════════════════════════════════════════════
-- V17. Add Missing SoftDelete Architectural Columns
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: 
--   Adds 'valid_from' and 'valid_to' columns to tables whose entities extend 
--   SoftDeleteEntity but were missing these columns in their initial schema.
-- 
-- Root Cause:
--   JPA/Hibernate selects all mapped columns from SoftDeleteEntity. If these 
--   columns are missing from the table, PostgreSQL throws a 500 error and 
--   aborts the transaction.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. BENEFIT POLICIES
ALTER TABLE benefit_policies 
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP,
ADD COLUMN IF NOT EXISTS valid_to TIMESTAMP;

-- 2. CLAIMS
ALTER TABLE claims 
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP,
ADD COLUMN IF NOT EXISTS valid_to TIMESTAMP;

-- 3. PRE-AUTHORIZATIONS
ALTER TABLE pre_authorizations 
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP,
ADD COLUMN IF NOT EXISTS valid_to TIMESTAMP;

-- 4. VISITS
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP,
ADD COLUMN IF NOT EXISTS valid_to TIMESTAMP;

-- 5. PROVIDERS
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP,
ADD COLUMN IF NOT EXISTS valid_to TIMESTAMP;

-- 6. MEDICAL SERVICES (Added 2026-02-19 - The missing piece!)
ALTER TABLE medical_services 
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP,
ADD COLUMN IF NOT EXISTS valid_to TIMESTAMP;

-- 7. MEDICAL PACKAGES
ALTER TABLE medical_packages 
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP,
ADD COLUMN IF NOT EXISTS valid_to TIMESTAMP;

-- 8. LIFECYCLE LOGS (Matches LifecycleLog.java)
-- This table was missing from previous migrations.
CREATE TABLE IF NOT EXISTS lifecycle_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    reason_code VARCHAR(50),
    reason_details VARCHAR(1000),
    performed_by VARCHAR(100),
    performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_entity ON lifecycle_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_action ON lifecycle_logs(action);

-- ═══════════════════════════════════════════════════════════════════════════
-- Verification: 
--   These columns are used for temporal validity and SCD Type 2 logic 
--   inherited from SoftDeleteEntity.
-- ═══════════════════════════════════════════════════════════════════════════
