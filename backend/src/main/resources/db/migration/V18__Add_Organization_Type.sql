-- Add organization type column to organizations table
ALTER TABLE organizations ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'EMPLOYER';

-- Update existing records if any (though unlikely to have many yet)
-- All existing organizations in V02 were intended to be Employers
UPDATE organizations SET type = 'EMPLOYER' WHERE type IS NULL;
