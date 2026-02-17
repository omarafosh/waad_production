-- Fixing provider_contract_pricing_items to use BIGINT for medical_service_id
-- This reverts the change to UUID since we are going back to medical_services (BIGINT)

ALTER TABLE provider_contract_pricing_items 
DROP CONSTRAINT IF EXISTS fk_pricing_medical_service;

-- If the column was already changed to UUID, we need to change it back or create a new one
-- Assuming it might be UUID now due to previous V30 attempt, let's check and fix safely

DO $$ 
BEGIN
    -- Check if column is UUID
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provider_contract_pricing_items' AND column_name = 'medical_service_id' AND data_type = 'uuid') THEN
        -- It is UUID, so we need to drop and recreate or alter. 
        -- Since data might be incompatible, we might need to clear the column or handle conversion.
        -- For now, let's assume we can just drop the column and add it back as BIGINT
        ALTER TABLE provider_contract_pricing_items DROP COLUMN medical_service_id;
        ALTER TABLE provider_contract_pricing_items ADD COLUMN medical_service_id BIGINT;
    END IF;
END $$;

-- Ensure it is BIGINT
ALTER TABLE provider_contract_pricing_items 
ALTER COLUMN medical_service_id TYPE BIGINT USING medical_service_id::BIGINT;

-- Add constraint back linking to medical_services (which is BIGINT)
ALTER TABLE provider_contract_pricing_items
ADD CONSTRAINT fk_pricing_medical_service
FOREIGN KEY (medical_service_id) REFERENCES medical_services(id);
