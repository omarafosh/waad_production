-- تم نقل هذه العناصر إلى V05__members.sql (الموحد)


-- 3. Ensure valid_from column exists in medical_services (Was reported missing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_services' AND column_name = 'valid_from') THEN
        ALTER TABLE medical_services ADD COLUMN valid_from TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_services' AND column_name = 'valid_to') THEN
        ALTER TABLE medical_services ADD COLUMN valid_to TIMESTAMP;
    END IF;
END $$;
