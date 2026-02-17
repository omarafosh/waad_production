-- Add new columns to provider_raw_services table to support Comprehensive Inventory Dashboard

ALTER TABLE provider_raw_services
ADD COLUMN IF NOT EXISTS category VARCHAR(255),
ADD COLUMN IF NOT EXISTS specialty VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_mapped BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS medical_service_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS mapped_at TIMESTAMP;

-- Update existing records to have is_mapped = false (if null)
UPDATE provider_raw_services SET is_mapped = false WHERE is_mapped IS NULL;

-- Index for performance on filtering by mapping status
CREATE INDEX IF NOT EXISTS idx_raw_services_mapped ON provider_raw_services(is_mapped);
CREATE INDEX IF NOT EXISTS idx_raw_services_provider_mapped ON provider_raw_services(provider_id, is_mapped);
