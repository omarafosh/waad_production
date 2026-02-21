-- V17: Normalize Member Data & Fix Structural Issues
-- ------------------------------------------------------

-- 1. Create table for Employment Details (Normalization)
CREATE TABLE IF NOT EXISTS member_employment_details (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    employer_org_id BIGINT NOT NULL,
    employee_number VARCHAR(100),
    department VARCHAR(100),
    designation VARCHAR(100),
    join_date DATE,
    cost_center VARCHAR(100),
    occupation VARCHAR(100),
    salary_band VARCHAR(50),
    
    -- Validity of this employment record
    valid_from DATE,
    valid_to DATE,
    active BOOLEAN DEFAULT TRUE,
    
    version BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    
    CONSTRAINT fk_employment_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT uk_member_active_employment UNIQUE (member_id, employer_org_id, active)
);

-- 2. Migrate existing data from members table to new table
INSERT INTO member_employment_details (
    member_id, 
    employer_org_id, 
    employee_number, 
    join_date, 
    occupation,
    active
)
SELECT 
    id, 
    employer_org_id, 
    employee_number, 
    join_date, 
    occupation,
    active
FROM members
WHERE employee_number IS NOT NULL;

-- 3. Cleanup Members Table (Remove Redundancy)

-- Add standardized status column if missing (Unified Status)
-- We will use 'status' (VARCHAR) as the single source of truth.
-- active (boolean) will be a generated column or maintained via triggers/app logic for performance query.

-- Drop redundant columns after migration
ALTER TABLE members 
    DROP COLUMN IF EXISTS employee_number,
    DROP COLUMN IF EXISTS join_date,
    DROP COLUMN IF EXISTS occupation;

-- Fix Status Redundancy
-- We keep 'status' and 'active'. 'card_status' is redundant if it mimics 'status'.
-- data migration for status
UPDATE members SET status = 'ACTIVE' WHERE active = TRUE AND status IS NULL;
UPDATE members SET status = 'INACTIVE' WHERE active = FALSE AND status IS NULL;

-- Add Missing Indexes (Performance)
CREATE INDEX IF NOT EXISTS idx_members_civil_id ON members(civil_id);
CREATE INDEX IF NOT EXISTS idx_members_card_number ON members(card_number);
CREATE INDEX IF NOT EXISTS idx_members_employer ON members(employer_org_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_full_name ON members USING gin (to_tsvector('simple', full_name));

-- 4. Add Constraints (Data Integrity)
ALTER TABLE members 
    ADD CONSTRAINT chk_member_civil_id_format CHECK (LENGTH(civil_id) >= 5);

