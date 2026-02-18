-- Add business_type column to settings table
ALTER TABLE settings ADD COLUMN business_type VARCHAR(100);

-- Update existing record with default value
UPDATE settings SET business_type = 'Health Insurance' WHERE id = 1;
