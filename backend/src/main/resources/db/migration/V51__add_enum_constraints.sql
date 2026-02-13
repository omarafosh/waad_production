-- ═══════════════════════════════════════════════════════════════════════════
-- V51: Add ENUM Constraints to All Tables
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: Add CHECK constraints for all ENUM columns across the system
-- Date: 2026-02-13
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. BENEFIT POLICIES MODULE (Already handled in V50, but adding for safety)
-- ═══════════════════════════════════════════════════════════════════════════

-- Add CHECK constraint for status (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_benefit_policy_status') THEN
        ALTER TABLE benefit_policies 
        ADD CONSTRAINT ck_benefit_policy_status 
        CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'TERMINATED', 'CANCELLED', 'INACTIVE', 'ARCHIVED'));
    END IF;
END $$;

-- Add CHECK constraint for distribution_type (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_benefit_policy_distribution_type') THEN
        ALTER TABLE benefit_policies 
        ADD CONSTRAINT ck_benefit_policy_distribution_type 
        CHECK (distribution_type IN ('UNIFIED', 'DISTRIBUTED'));
    END IF;
END $$;

-- Add CHECK constraint for encounter_type in rules (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_bpr_encounter_type') THEN
        ALTER TABLE benefit_policy_rules 
        ADD CONSTRAINT ck_bpr_encounter_type 
        CHECK (encounter_type IS NULL OR encounter_type IN ('OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'TELECONSULTATION', 'HOME_VISIT'));
    END IF;
END $$;

-- Add CHECK constraint for apply_on in rules (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_bpr_apply_on') THEN
        ALTER TABLE benefit_policy_rules 
        ADD CONSTRAINT ck_bpr_apply_on 
        CHECK (apply_on IS NULL OR apply_on IN ('SERVICE', 'CATEGORY', 'PACKAGE'));
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. CLAIMS MODULE
-- ═══════════════════════════════════════════════════════════════════════════

-- Claims status
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'claims') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_claim_status') THEN
            ALTER TABLE claims 
            ADD CONSTRAINT ck_claim_status 
            CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'PAID', 'CANCELLED'));
        END IF;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. PRE-AUTHORIZATIONS MODULE
-- ═══════════════════════════════════════════════════════════════════════════

-- PreAuth status
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pre_authorizations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_preauth_status') THEN
            ALTER TABLE pre_authorizations 
            ADD CONSTRAINT ck_preauth_status 
            CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'));
        END IF;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. MEMBERS MODULE
-- ═══════════════════════════════════════════════════════════════════════════

-- Member status
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_member_status') THEN
            ALTER TABLE members 
            ADD CONSTRAINT ck_member_status 
            CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED'));
        END IF;
    END IF;
END $$;

-- Member gender
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_member_gender') THEN
            ALTER TABLE members 
            ADD CONSTRAINT ck_member_gender 
            CHECK (gender IN ('MALE', 'FEMALE'));
        END IF;
    END IF;
END $$;

-- Member relationship (for dependents)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'relationship') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_member_relationship') THEN
            ALTER TABLE members 
            ADD CONSTRAINT ck_member_relationship 
            CHECK (relationship IS NULL OR relationship IN ('SELF', 'SPOUSE', 'SON', 'DAUGHTER', 'FATHER', 'MOTHER', 'BROTHER', 'SISTER'));
        END IF;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. PROVIDERS MODULE
-- ═══════════════════════════════════════════════════════════════════════════

-- Provider status
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'providers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_provider_status') THEN
            ALTER TABLE providers 
            ADD CONSTRAINT ck_provider_status 
            CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLACKLISTED'));
        END IF;
    END IF;
END $$;

-- Provider type
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'providers') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'providers' AND column_name = 'provider_type') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_provider_type') THEN
            ALTER TABLE providers 
            ADD CONSTRAINT ck_provider_type 
            CHECK (provider_type IN ('HOSPITAL', 'CLINIC', 'PHARMACY', 'LABORATORY', 'RADIOLOGY', 'DENTAL', 'OPTICAL'));
        END IF;
    END IF;
END $$;

-- Provider contract status
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'provider_contracts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_contract_status') THEN
            ALTER TABLE provider_contracts 
            ADD CONSTRAINT ck_contract_status 
            CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'SUSPENDED'));
        END IF;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. VISITS MODULE
-- ═══════════════════════════════════════════════════════════════════════════

-- Visit status
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visits') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_visit_status') THEN
            ALTER TABLE visits 
            ADD CONSTRAINT ck_visit_status 
            CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'));
        END IF;
    END IF;
END $$;

-- Visit type (encounter type)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visits') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visits' AND column_name = 'visit_type') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_visit_type') THEN
            ALTER TABLE visits 
            ADD CONSTRAINT ck_visit_type 
            CHECK (visit_type IN ('OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'TELECONSULTATION', 'HOME_VISIT'));
        END IF;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. ORGANIZATIONS MODULE
-- ═══════════════════════════════════════════════════════════════════════════

-- Organization type
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'org_type') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_org_type') THEN
            ALTER TABLE organizations 
            ADD CONSTRAINT ck_org_type 
            CHECK (org_type IN ('EMPLOYER', 'INSURANCE', 'PROVIDER', 'TPA', 'GOVERNMENT'));
        END IF;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. APPROVAL REQUESTS MODULE
-- ═══════════════════════════════════════════════════════════════════════════

-- Approval request status
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_requests') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_approval_status') THEN
            ALTER TABLE approval_requests 
            ADD CONSTRAINT ck_approval_status 
            CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));
        END IF;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. SETTLEMENT MODULE
-- ═══════════════════════════════════════════════════════════════════════════

-- Settlement batch status
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settlement_batches') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'ck_settlement_status') THEN
            ALTER TABLE settlement_batches 
            ADD CONSTRAINT ck_settlement_status 
            CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED'));
        END IF;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. VALIDATION REPORT
-- ═══════════════════════════════════════════════════════════════════════════

-- Generate a report of any invalid ENUM values that need to be fixed
DO $$
DECLARE
    report TEXT := '';
    invalid_count INTEGER;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'ENUM VALIDATION REPORT';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Check benefit_policies.status
    SELECT COUNT(*) INTO invalid_count FROM benefit_policies 
    WHERE status NOT IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'TERMINATED', 'CANCELLED', 'INACTIVE', 'ARCHIVED');
    IF invalid_count > 0 THEN
        RAISE WARNING 'benefit_policies.status: % invalid values found', invalid_count;
    ELSE
        RAISE NOTICE 'benefit_policies.status: OK';
    END IF;
    
    -- Check benefit_policies.distribution_type
    SELECT COUNT(*) INTO invalid_count FROM benefit_policies 
    WHERE distribution_type NOT IN ('UNIFIED', 'DISTRIBUTED');
    IF invalid_count > 0 THEN
        RAISE WARNING 'benefit_policies.distribution_type: % invalid values found', invalid_count;
    ELSE
        RAISE NOTICE 'benefit_policies.distribution_type: OK';
    END IF;
    
    -- Check benefit_policy_rules.encounter_type
    SELECT COUNT(*) INTO invalid_count FROM benefit_policy_rules 
    WHERE encounter_type IS NOT NULL 
    AND encounter_type NOT IN ('OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'TELECONSULTATION', 'HOME_VISIT');
    IF invalid_count > 0 THEN
        RAISE WARNING 'benefit_policy_rules.encounter_type: % invalid values found', invalid_count;
    ELSE
        RAISE NOTICE 'benefit_policy_rules.encounter_type: OK';
    END IF;
    
    -- Check benefit_policy_rules.apply_on
    SELECT COUNT(*) INTO invalid_count FROM benefit_policy_rules 
    WHERE apply_on IS NOT NULL 
    AND apply_on NOT IN ('SERVICE', 'CATEGORY', 'PACKAGE');
    IF invalid_count > 0 THEN
        RAISE WARNING 'benefit_policy_rules.apply_on: % invalid values found', invalid_count;
    ELSE
        RAISE NOTICE 'benefit_policy_rules.apply_on: OK';
    END IF;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'VALIDATION COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════
