-- Add dependent_suffixes column to settings table
ALTER TABLE settings ADD COLUMN dependent_suffixes TEXT;

-- Update existing record with default JSON value
UPDATE settings SET dependent_suffixes = '{"WIFE":"W","HUSBAND":"H","SON":"S","DAUGHTER":"D","FATHER":"F","MOTHER":"M","BROTHER":"B","SISTER":"I"}' WHERE id = 1;
