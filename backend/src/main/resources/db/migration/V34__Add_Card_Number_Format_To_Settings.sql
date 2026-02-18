-- Add card_number_format column to settings table
ALTER TABLE settings ADD COLUMN card_number_format VARCHAR(100);

-- Update existing record with default value
UPDATE settings SET card_number_format = '[MP_NO]-[YEAR]-[PRO]' WHERE id = 1;
