-- ═══════════════════════════════════════════════════════════════════════════
-- 10. Settlements & Finance (Consolidated & Refined)
-- ═══════════════════════════════════════════════════════════════════════════
-- This file defines the financial structure for provider settlements.
-- Matches ProviderAccount.java and SettlementBatch.java entities.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. PROVIDER ACCOUNTS (Matches ProviderAccount.java + account_number)
CREATE TABLE IF NOT EXISTS provider_accounts (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL UNIQUE, -- 1:1 with Provider
    account_number VARCHAR(50) UNIQUE NOT NULL, -- User Requested Field
    
    running_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_approved DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_paid DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, CLOSED
    last_transaction_at TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_provider_account_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    CONSTRAINT chk_provider_account_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED'))
);

CREATE INDEX IF NOT EXISTS idx_provider_accounts_provider_id ON provider_accounts(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_accounts_number ON provider_accounts(account_number);

-- 2. SETTLEMENT BATCHES (Matches SettlementBatch.java)
CREATE TABLE IF NOT EXISTS settlement_batches (
    id BIGSERIAL PRIMARY KEY,
    batch_number VARCHAR(50) UNIQUE NOT NULL, -- Format: STL-YYYY-NNNNNN
    provider_account_id BIGINT NOT NULL,
    settlement_date DATE NOT NULL,
    
    -- Calculated Totals
    total_claims_count INTEGER NOT NULL DEFAULT 0,
    total_gross_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_net_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_patient_share DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, CONFIRMED, PAID, CANCELLED
    
    -- Payment Details
    payment_reference VARCHAR(100),
    payment_method VARCHAR(50), -- BANK_TRANSFER, CHECK, CASH, WIRE_TRANSFER
    payment_date DATE,
    bank_account_number VARCHAR(50),
    notes TEXT,
    
    -- Workflow Tracking
    created_by BIGINT,
    confirmed_by BIGINT,
    confirmed_at TIMESTAMP,
    paid_by BIGINT,
    paid_at TIMESTAMP,
    cancelled_by BIGINT,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_settlement_batch_account FOREIGN KEY (provider_account_id) REFERENCES provider_accounts(id),
    CONSTRAINT chk_settlement_batch_status CHECK (status IN ('DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED')),
    CONSTRAINT chk_settlement_payment_method CHECK (payment_method IN ('BANK_TRANSFER', 'CHECK', 'CASH', 'WIRE_TRANSFER'))
);

CREATE INDEX IF NOT EXISTS idx_settlement_batches_account ON settlement_batches(provider_account_id);
CREATE INDEX IF NOT EXISTS idx_settlement_batches_status ON settlement_batches(status);
CREATE INDEX IF NOT EXISTS idx_settlement_batches_number ON settlement_batches(batch_number);

-- 3. SETTLEMENT BATCH ITEMS (Matches SettlementBatchItem.java)
CREATE TABLE IF NOT EXISTS settlement_batch_items (
    id BIGSERIAL PRIMARY KEY,
    settlement_batch_id BIGINT NOT NULL,
    claim_id BIGINT NOT NULL,
    
    gross_amount_snapshot DECIMAL(15, 2) NOT NULL,
    net_amount_snapshot DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    patient_share_snapshot DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_settlement_item_batch FOREIGN KEY (settlement_batch_id) REFERENCES settlement_batches(id) ON DELETE CASCADE,
    CONSTRAINT fk_settlement_item_claim FOREIGN KEY (claim_id) REFERENCES claims(id)
);

CREATE INDEX IF NOT EXISTS idx_settlement_items_batch ON settlement_batch_items(settlement_batch_id);
CREATE INDEX IF NOT EXISTS idx_settlement_items_claim ON settlement_batch_items(claim_id);

-- 4. ACCOUNT TRANSACTIONS (Matches AccountTransaction.java)
CREATE TABLE IF NOT EXISTS account_transactions (
    id BIGSERIAL PRIMARY KEY,
    provider_account_id BIGINT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- CREDIT, DEBIT
    amount DECIMAL(15, 2) NOT NULL,
    balance_before DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    reference_type VARCHAR(50) NOT NULL, -- CLAIM_APPROVED, BATCH_PAID, ADJUSTMENT, REVERSAL
    reference_id BIGINT,
    description VARCHAR(500),
    created_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_transaction_account FOREIGN KEY (provider_account_id) REFERENCES provider_accounts(id),
    CONSTRAINT chk_transaction_type CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
    CONSTRAINT chk_transaction_ref_type CHECK (reference_type IN ('CLAIM_APPROVED', 'BATCH_PAID', 'ADJUSTMENT', 'REVERSAL'))
);

CREATE INDEX IF NOT EXISTS idx_account_transactions_account ON account_transactions(provider_account_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_created_at ON account_transactions(created_at DESC);

-- 5. IMMUTABILITY TRIGGERS
CREATE OR REPLACE FUNCTION prevent_account_transaction_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Account transactions are IMMUTABLE. No UPDATE or DELETE allowed.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_account_transaction_update ON account_transactions;
CREATE TRIGGER trg_prevent_account_transaction_update
    BEFORE UPDATE ON account_transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_account_transaction_modification();

DROP TRIGGER IF EXISTS trg_prevent_account_transaction_delete ON account_transactions;
CREATE TRIGGER trg_prevent_account_transaction_delete
    BEFORE DELETE ON account_transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_account_transaction_modification();
