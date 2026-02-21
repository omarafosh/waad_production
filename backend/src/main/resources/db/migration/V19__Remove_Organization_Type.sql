-- Remove Organization Type field from organizations table
ALTER TABLE organizations DROP COLUMN IF EXISTS type;
