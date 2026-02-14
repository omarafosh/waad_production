-- ═══════════════════════════════════════════════════════════════════════════
-- V12: SCHEMA CONSOLIDATION & SYNC (توحيد وتزامن هيكلية قاعدة البيانات)
-- This migration consolidates previous patches (V12-V16) into a single, clean file.
-- It ensures the database schema matches the Java Entities EXACTLY.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. MISSING SEQUENCES (التسلسلات المفقودة)
CREATE SEQUENCE IF NOT EXISTS seq_smart_card_random_id START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS member_barcode_seq START WITH 2000000 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS member_card_number_seq START WITH 1000000 INCREMENT BY 1;

-- 2. CREATE ORGANIZATIONS TABLE (جدول المؤسسات)
-- This was missing from V02 but used by the Code/Seeder.
CREATE TABLE IF NOT EXISTS organizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(100),
    archived BOOLEAN DEFAULT FALSE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version BIGINT DEFAULT 0
);

-- 3. PROVIDERS SYNC (تحديث مقدمي الخدمة)
ALTER TABLE providers DROP COLUMN IF EXISTS provider_type;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS valid_to TIMESTAMP;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS network_status VARCHAR(50) DEFAULT 'IN_NETWORK';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS default_discount_rate DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS allow_all_employers BOOLEAN DEFAULT TRUE;

-- 4. MEMBERS SYNC (تحديث الأعضاء)
-- 4.1. Add Missing Columns
ALTER TABLE members ADD COLUMN IF NOT EXISTS employer_org_id BIGINT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS insurance_org_id BIGINT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS benefit_policy_id BIGINT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP;
ALTER TABLE members ADD COLUMN IF NOT EXISTS valid_to TIMESTAMP;
ALTER TABLE members ADD COLUMN IF NOT EXISTS relationship_code VARCHAR(5);
ALTER TABLE members ADD COLUMN IF NOT EXISTS provider_code VARCHAR(3);
ALTER TABLE members ADD COLUMN IF NOT EXISTS company_code VARCHAR(20);
ALTER TABLE members ADD COLUMN IF NOT EXISTS internal_id_part VARCHAR(20);
ALTER TABLE members ADD COLUMN IF NOT EXISTS card_activated_at TIMESTAMP;
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_smart_card BOOLEAN DEFAULT FALSE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS secondary_status VARCHAR(50);
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS emergency_notes VARCHAR(1000);
ALTER TABLE members ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20);
ALTER TABLE members ADD COLUMN IF NOT EXISTS policy_number VARCHAR(100);
ALTER TABLE members ADD COLUMN IF NOT EXISTS employee_number VARCHAR(100);
ALTER TABLE members ADD COLUMN IF NOT EXISTS join_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS occupation VARCHAR(100);
ALTER TABLE members ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS card_status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE members ADD COLUMN IF NOT EXISTS blocked_reason VARCHAR(500);
ALTER TABLE members ADD COLUMN IF NOT EXISTS eligibility_status BOOLEAN DEFAULT TRUE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS eligibility_updated_at TIMESTAMP;
ALTER TABLE members ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);
ALTER TABLE members ADD COLUMN IF NOT EXISTS notes VARCHAR(2000);

-- 4.2. Fix Foreign Keys (Point to organizations instead of employers)
ALTER TABLE members DROP CONSTRAINT IF EXISTS fk_member_employer;
ALTER TABLE members DROP CONSTRAINT IF EXISTS fk_member_employer_org;
ALTER TABLE members ADD CONSTRAINT fk_member_employer_org FOREIGN KEY (employer_org_id) REFERENCES organizations(id);

ALTER TABLE members DROP CONSTRAINT IF EXISTS fk_member_insurance_org;
ALTER TABLE members ADD CONSTRAINT fk_member_insurance_org FOREIGN KEY (insurance_org_id) REFERENCES organizations(id);

-- 4.3. Fix Policies FK
ALTER TABLE benefit_policies ADD COLUMN IF NOT EXISTS employer_id BIGINT;
ALTER TABLE benefit_policies DROP CONSTRAINT IF EXISTS fk_policy_employer;
ALTER TABLE benefit_policies ADD CONSTRAINT fk_policy_employer_org FOREIGN KEY (employer_id) REFERENCES organizations(id);

-- 4.4. Fix Check Constraints (Enum Sync)
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_relationship_check;
ALTER TABLE members ADD CONSTRAINT members_relationship_check 
CHECK (relationship IN ('WIFE', 'HUSBAND', 'SON', 'DAUGHTER', 'FATHER', 'MOTHER', 'BROTHER', 'SISTER', 'SPOUSE', 'CHILD', 'PARENT', 'OTHER'));

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_gender_check;
ALTER TABLE members ADD CONSTRAINT members_gender_check 
CHECK (gender IN ('MALE', 'FEMALE', 'UNDEFINED'));

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_status_check;
ALTER TABLE members ADD CONSTRAINT members_status_check 
CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TERMINATED', 'PENDING', 'DRAFT', 'PENDING_VERIFICATION'));

-- 5. PRE-AUTHORIZATIONS SYNC (تحديث الموافقات المسبقة)
-- Rename mismatched columns to match Entity
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pre_authorizations' AND column_name='authorization_number') THEN
        ALTER TABLE pre_authorizations RENAME COLUMN authorization_number TO pre_auth_number;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pre_authorizations' AND column_name='requested_date') THEN
        ALTER TABLE pre_authorizations RENAME COLUMN requested_date TO request_date;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pre_authorizations' AND column_name='service_date') THEN
        ALTER TABLE pre_authorizations RENAME COLUMN service_date TO expected_service_date;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pre_authorizations' AND column_name='medical_category_id') THEN
        ALTER TABLE pre_authorizations RENAME COLUMN medical_category_id TO service_category_id;
    END IF;
END $$;

-- Drop obsolete columns
ALTER TABLE pre_authorizations DROP COLUMN IF EXISTS estimated_cost;

-- Add missing columns
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS reference_number VARCHAR(50);
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS service_code VARCHAR(50);
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS service_name VARCHAR(200);
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS service_type VARCHAR(100) DEFAULT 'MEDICAL';
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS contract_price DECIMAL(10, 2);
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS copay_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS copay_percentage DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS insurance_covered_amount DECIMAL(10, 2);
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS reserved_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'LYD';
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL';
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS visit_id BIGINT;
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS requires_pa BOOLEAN DEFAULT TRUE;
ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- Adjust constraints
ALTER TABLE pre_authorizations ALTER COLUMN pre_auth_number SET NOT NULL;
ALTER TABLE pre_authorizations ALTER COLUMN member_id SET NOT NULL;
ALTER TABLE pre_authorizations ALTER COLUMN provider_id SET NOT NULL;
-- NOTE: We don't enforce NOT NULL on visit_id immediately to allow migration of old data if any

-- 6. CLAIMS SYNC (تحديث المطالبات)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims' AND column_name='total_claimed_amount') THEN
        ALTER TABLE claims RENAME COLUMN total_claimed_amount TO requested_amount;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims' AND column_name='total_approved_amount') THEN
        ALTER TABLE claims RENAME COLUMN total_approved_amount TO approved_amount;
    END IF;
END $$;

ALTER TABLE claims ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS valid_to TIMESTAMP;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS diagnosis_code VARCHAR(20);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS diagnosis_description VARCHAR(500);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS reviewer_comment TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS patient_copay DECIMAL(15, 2);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS net_provider_amount DECIMAL(15, 2);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS difference_amount DECIMAL(15, 2);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS copay_percent DECIMAL(5, 2);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS deductible_applied DECIMAL(15, 2);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS settlement_notes TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS expected_completion_date DATE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS actual_completion_date DATE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS within_sla BOOLEAN;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS business_days_taken INTEGER;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS sla_days_configured INTEGER;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS service_count INTEGER;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS attachments_count INTEGER;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS insurance_org_id BIGINT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- 7. FINANCIAL TABLES (الحسابات والتسويات)
-- 7.1. Provider Accounts
CREATE TABLE IF NOT EXISTS provider_accounts (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL UNIQUE,
    running_balance DECIMAL(15, 2) DEFAULT 0,
    total_approved DECIMAL(15, 2) DEFAULT 0,
    total_paid DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    last_transaction_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version BIGINT DEFAULT 0,
    CONSTRAINT fk_pa_provider UNIQUE (provider_id)
);

-- 7.2. Settlement Batches
DROP TABLE IF EXISTS settlement_claims CASCADE;
DROP TABLE IF EXISTS settlements CASCADE;

CREATE TABLE IF NOT EXISTS settlement_batches (
    id BIGSERIAL PRIMARY KEY,
    batch_number VARCHAR(50) NOT NULL UNIQUE,
    provider_account_id BIGINT NOT NULL,
    settlement_date DATE NOT NULL,
    total_claims_count INTEGER DEFAULT 0,
    total_gross_amount DECIMAL(15, 2) DEFAULT 0,
    total_net_amount DECIMAL(15, 2) DEFAULT 0,
    total_patient_share DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'DRAFT',
    payment_reference VARCHAR(100),
    payment_method VARCHAR(50),
    payment_date DATE,
    bank_account_number VARCHAR(50),
    notes TEXT,
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_by BIGINT,
    confirmed_at TIMESTAMP,
    paid_by BIGINT,
    paid_at TIMESTAMP,
    cancelled_by BIGINT,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settlement_batch_items (
    id BIGSERIAL PRIMARY KEY,
    settlement_batch_id BIGINT NOT NULL,
    claim_id BIGINT NOT NULL UNIQUE,
    gross_amount_snapshot DECIMAL(15, 2) NOT NULL,
    net_amount_snapshot DECIMAL(15, 2) NOT NULL,
    patient_share_snapshot DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sbi_batch FOREIGN KEY (settlement_batch_id) REFERENCES settlement_batches(id) ON DELETE CASCADE
);

-- 7.3. Account Transactions Sync
ALTER TABLE account_transactions DROP COLUMN IF EXISTS transaction_number;
ALTER TABLE account_transactions DROP COLUMN IF EXISTS settlement_id;
ALTER TABLE account_transactions DROP COLUMN IF EXISTS provider_id;
ALTER TABLE account_transactions DROP COLUMN IF EXISTS transaction_date;
ALTER TABLE account_transactions DROP COLUMN IF EXISTS payment_method;
ALTER TABLE account_transactions DROP COLUMN IF EXISTS payment_reference;
ALTER TABLE account_transactions DROP COLUMN IF EXISTS updated_by;

ALTER TABLE account_transactions ADD COLUMN IF NOT EXISTS provider_account_id BIGINT;
ALTER TABLE account_transactions ADD COLUMN IF NOT EXISTS balance_before DECIMAL(15, 2);
ALTER TABLE account_transactions ADD COLUMN IF NOT EXISTS balance_after DECIMAL(15, 2);
ALTER TABLE account_transactions ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
ALTER TABLE account_transactions ADD COLUMN IF NOT EXISTS reference_id BIGINT;

-- Clean up created_by only if it is text/varchar
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'account_transactions' 
        AND column_name = 'created_by' 
        AND data_type IN ('character varying', 'text')
    ) THEN
        EXECUTE 'UPDATE account_transactions SET created_by = NULL WHERE created_by !~ ''^[0-9]+$''';
        EXECUTE 'ALTER TABLE account_transactions ALTER COLUMN created_by TYPE BIGINT USING created_by::bigint';
    END IF;
END $$;

-- Ensure created_by is BIGINT (idempotent)
-- ALTER TABLE account_transactions ALTER COLUMN created_by TYPE BIGINT USING created_by::bigint;

-- 8. AUDIT SYNC FOR EMPLOYERS
ALTER TABLE employers ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE employers ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP;
ALTER TABLE employers ADD COLUMN IF NOT EXISTS valid_to TIMESTAMP;

-- 9. WORKFLOW & APPROVALS (سير العمل والموافقات)
CREATE TABLE IF NOT EXISTS approval_requests (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT,
    action VARCHAR(50) NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    maker_user VARCHAR(100) NOT NULL,
    checker_user VARCHAR(100),
    maker_notes TEXT,
    checker_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

