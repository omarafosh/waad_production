-- ═══════════════════════════════════════════════════════════════════════════
-- V36: Ensure Members Schema Consistency (civil_id, photo_url)
-- ═══════════════════════════════════════════════════════════════════════════
-- This script ensures that the members table has the correct columns after 
-- the refactoring from national_number to civil_id and profile_photo_path to photo_url.
-- Idempotent script using DO block.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ 
BEGIN 
    -- 1. Rename national_number to civil_id if it exists and civil_id doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'national_number') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'civil_id') THEN
        RAISE NOTICE 'Renaming national_number to civil_id in members table';
        ALTER TABLE members RENAME COLUMN national_number TO civil_id;
    END IF;

    -- 2. Rename profile_photo_path to photo_url if it exists and photo_url doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'profile_photo_path') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'photo_url') THEN
        RAISE NOTICE 'Renaming profile_photo_path to photo_url in members table';
        ALTER TABLE members RENAME COLUMN profile_photo_path TO photo_url;
    END IF;

    -- 3. Ensure civil_id exists (if not renamed and missing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'civil_id') THEN
        RAISE NOTICE 'Adding civil_id column to members table';
        ALTER TABLE members ADD COLUMN civil_id VARCHAR(50);
    END IF;

    -- 4. Ensure photo_url exists (if not renamed and missing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'photo_url') THEN
        RAISE NOTICE 'Adding photo_url column to members table';
        ALTER TABLE members ADD COLUMN photo_url VARCHAR(1000);
    END IF;

    -- 5. Add unique constraint if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'members' AND constraint_name = 'uk_member_civil_id') THEN
        RAISE NOTICE 'Adding unique constraint uk_member_civil_id';
        ALTER TABLE members ADD CONSTRAINT uk_member_civil_id UNIQUE (civil_id);
    END IF;

    -- ═══════════════════════════════════════════════════════════════════════════
    -- USERS TABLE
    -- ═══════════════════════════════════════════════════════════════════════════

    -- 7. Rename national_id/national_number to civil_id in users if missed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'national_id') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'civil_id') THEN
        RAISE NOTICE 'Renaming national_id to civil_id in users table';
        ALTER TABLE users RENAME COLUMN national_id TO civil_id;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'national_number') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'civil_id') THEN
        RAISE NOTICE 'Renaming national_number to civil_id in users table';
        ALTER TABLE users RENAME COLUMN national_number TO civil_id;
    END IF;

    -- 8. Ensure civil_id exists in users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'civil_id') THEN
        RAISE NOTICE 'Adding civil_id column to users table';
        ALTER TABLE users ADD COLUMN civil_id VARCHAR(50);
    END IF;

    -- 9. Add unique constraint if missing for users.civil_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'users' AND constraint_name = 'uk_user_civil_id') THEN
        RAISE NOTICE 'Adding unique constraint uk_user_civil_id';
        ALTER TABLE users ADD CONSTRAINT uk_user_civil_id UNIQUE (civil_id);
    END IF;

END $$;
