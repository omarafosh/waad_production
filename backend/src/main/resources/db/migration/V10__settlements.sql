-- ═══════════════════════════════════════════════════════════════════════════
-- 10. Settlements & Finance (Consolidated)
-- ═══════════════════════════════════════════════════════════════════════════
-- Sources: V9010, V9027, V9008
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. PROVIDER ACCOUNTS
CREATE TABLE IF NOT EXISTS provider_accounts (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    
    running_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00, -- From V9027
    total_approved DECIMAL(15, 2) NOT NULL DEFAULT 0.00,  -- From V9027
    total_paid DECIMAL(15, 2) NOT NULL DEFAULT 0.00,      -- From V9027
    
    total_credits DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_debits DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    
    last_transaction_at TIMESTAMP, -- Renamed from last_transaction_date in V9027
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- From V9027
    version BIGINT NOT NULL DEFAULT 0, -- From V9027
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_provider_account_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_provider_accounts_provider_id ON provider_accounts(provider_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_accounts_account_number ON provider_accounts(account_number);

-- 2. SETTLEMENT BATCHES
CREATE TABLE IF NOT EXISTS settlement_batches (
    id BIGSERIAL PRIMARY KEY,
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    provider_account_id BIGINT NOT NULL, -- Renamed from provider_id in V9027, FK updated? V9027 didn't update FK, we should.
    
    total_net_amount DECIMAL(15, 2) NOT NULL, -- Renamed from total_amount
    total_gross_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00, -- From V9027
    total_patient_share DECIMAL(15, 2) NOT NULL DEFAULT 0.00, -- From V9027
    total_claims_count INTEGER NOT NULL DEFAULT 0, -- From V9027
    
    status VARCHAR(50) NOT NULL,
    
    payment_date DATE,
    payment_reference VARCHAR(200),
    payment_method VARCHAR(50), -- From V9027
    bank_account_number VARCHAR(50), -- From V9027
    
    settlement_date DATE, -- From V9027
    notes TEXT,
    
    -- Workflow
    confirmed_by BIGINT,
    confirmed_at TIMESTAMP,
    paid_by BIGINT,
    paid_at TIMESTAMP,
    cancelled_by BIGINT,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    
    version BIGINT NOT NULL DEFAULT 0,
    created_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_settlement_batch_account FOREIGN KEY (provider_account_id) REFERENCES provider_accounts(id)
    -- Wait, provider_account_id should refer to provider_accounts(id). 
    -- But in V9010 it referred to providers(id) via provider_id column.
    -- If V9027 renamed it to provider_account_id, it implicitly implies it should refer to provider_accounts.
    -- Let's check V10. V9027 doesn't change FK.
    -- We will assume it refers to providers(id) for now unless provider_account_id is strictly account ID.
    -- Given it's "provider_account_id", it should be account.
    -- Let's point to providers(id) as it's safer for migration or provider_accounts(provider_id).
    -- Actually, simpler: keep it pointing to providers(id) but name it provider_id if that was the intent, or if it really is account id, point to account.
    -- V9027: "ALTER TABLE settlement_batches RENAME COLUMN provider_id TO provider_account_id;"
    -- This suggests the value holds ProviderAccountID now? Or just a rename?
    -- If just a rename, and data wasn't migrated, it still holds ProviderID.
    -- But since we are creating fresh, we should make it refer to provider_accounts(id).
    -- CONSTRAINT fk_settlement_batch_account FOREIGN KEY (provider_account_id) REFERENCES provider_accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_settlement_batches_provider_id ON settlement_batches(provider_account_id);
CREATE INDEX IF NOT EXISTS idx_settlement_batches_status ON settlement_batches(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_batches_batch_number ON settlement_batches(batch_number);

-- 3. SETTLEMENT BATCH ITEMS
CREATE TABLE IF NOT EXISTS settlement_batch_items (
    id BIGSERIAL PRIMARY KEY,
    settlement_batch_id BIGINT NOT NULL, -- Renamed from batch_id in V9027
    claim_id BIGINT NOT NULL,
    
    gross_amount_snapshot DECIMAL(15, 2) NOT NULL, -- Renamed from amount
    net_amount_snapshot DECIMAL(15, 2) NOT NULL DEFAULT 0.00, -- From V9027
    patient_share_snapshot DECIMAL(15, 2) NOT NULL DEFAULT 0.00, -- From V9027
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_settlement_item_batch FOREIGN KEY (settlement_batch_id) REFERENCES settlement_batches(id) ON DELETE CASCADE,
    CONSTRAINT fk_settlement_item_claim FOREIGN KEY (claim_id) REFERENCES claims(id)
);

CREATE INDEX IF NOT EXISTS idx_settlement_items_batch_id ON settlement_batch_items(settlement_batch_id);
CREATE INDEX IF NOT EXISTS idx_settlement_items_claim_id ON settlement_batch_items(claim_id);

-- 4. ACCOUNT TRANSACTIONS (From V9008)
CREATE TABLE IF NOT EXISTS account_transactions (
    id BIGSERIAL PRIMARY KEY,
    provider_account_id BIGINT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    balance_before DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN ('CLAIM_APPROVED', 'BATCH_PAID', 'ADJUSTMENT', 'REVERSAL')),
    reference_id BIGINT,
    description VARCHAR(500),
    created_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_transactions_provider_account ON account_transactions(provider_account_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_reference ON account_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_created_at ON account_transactions(created_at DESC);

-- IMMUTABILITY TRIGGER (V9008)
CREATE OR REPLACE FUNCTION prevent_account_transaction_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Account transactions are IMMUTABLE. No UPDATE or DELETE allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_account_transaction_update
    BEFORE UPDATE ON account_transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_account_transaction_modification();

CREATE TRIGGER trg_prevent_account_transaction_delete
    BEFORE DELETE ON account_transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_account_transaction_modification();
