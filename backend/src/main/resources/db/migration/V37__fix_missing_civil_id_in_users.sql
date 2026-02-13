-- ═══════════════════════════════════════════════════════════════════════════
-- V37: Fix Missing civil_id in Users Table
-- ═══════════════════════════════════════════════════════════════════════════
-- This script ensures that the users table has the correct civil_id column.
-- It handles cases where local databases were initialized before civil_id was added 
-- to V01 or where V36 was applied before it included the users table fix.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ 
BEGIN 
    -- 1. Rename national_id to civil_id if it exists and civil_id doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'national_id') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'civil_id') THEN
        RAISE NOTICE 'Renaming national_id to civil_id in users table';
        ALTER TABLE users RENAME COLUMN national_id TO civil_id;
    END IF;

    -- 2. Rename national_number to civil_id if it exists and civil_id doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'national_number') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'civil_id') THEN
        RAISE NOTICE 'Renaming national_number to civil_id in users table';
        ALTER TABLE users RENAME COLUMN national_number TO civil_id;
    END IF;

    -- 3. Ensure civil_id exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'civil_id') THEN
        RAISE NOTICE 'Adding civil_id column to users table';
        ALTER TABLE users ADD COLUMN civil_id VARCHAR(50);
    END IF;

    -- 4. Add unique constraint if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'users' AND constraint_name = 'uk_user_civil_id') THEN
        RAISE NOTICE 'Adding unique constraint uk_user_civil_id';
        -- Ensure no duplicates exist before adding constraint (optional, but safer to let it fail if data is dirty)
        ALTER TABLE users ADD CONSTRAINT uk_user_civil_id UNIQUE (civil_id);
    END IF;

END $$;
