-- Fix medical_service_id type mismatch in provider_contract_pricing_items
-- Change from BIGINT to UUID to match ent_medical_services

-- 1. Drop existing foreign key constraint
ALTER TABLE provider_contract_pricing_items 
DROP CONSTRAINT IF EXISTS fk_pcpi_service;

-- 2. Change column type from BIGINT to UUID
ALTER TABLE provider_contract_pricing_items 
ALTER COLUMN medical_service_id TYPE UUID USING medical_service_id::text::uuid;

-- 3. Re-add foreign key constraint to ent_medical_services
ALTER TABLE provider_contract_pricing_items 
ADD CONSTRAINT fk_pcpi_enterprise_service 
FOREIGN KEY (medical_service_id) 
REFERENCES ent_medical_services(id) 
ON DELETE SET NULL;

-- 4. Update index
DROP INDEX IF EXISTS idx_pricing_service_id;
CREATE INDEX idx_pricing_service_id ON provider_contract_pricing_items(medical_service_id);
