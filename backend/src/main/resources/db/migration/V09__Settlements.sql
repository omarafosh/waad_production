-- ═══════════════════════════════════════════════════════════════════════════
-- V09: SETTLEMENTS & TRANSACTIONS (التسويات والمعاملات المالية)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. SETTLEMENTS (التسويات)
CREATE TABLE IF NOT EXISTS settlements (
    id BIGSERIAL PRIMARY KEY,
    settlement_number VARCHAR(100) UNIQUE,
    provider_id BIGINT NOT NULL,
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    total_claims_amount DECIMAL(15, 2) DEFAULT 0,
    total_approved_amount DECIMAL(15, 2) DEFAULT 0,
    total_deductions DECIMAL(15, 2) DEFAULT 0,
    net_settlement_amount DECIMAL(15, 2) DEFAULT 0,
    payment_method VARCHAR(50) CHECK (payment_method IN ('BANK_TRANSFER', 'CHEQUE', 'CASH', 'OTHER')),
    payment_reference VARCHAR(100),
    payment_date DATE,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'PAID', 'CANCELLED')),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_settlement_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

-- 2. SETTLEMENT CLAIMS (مطالبات التسوية)
CREATE TABLE IF NOT EXISTS settlement_claims (
    id BIGSERIAL PRIMARY KEY,
    settlement_id BIGINT NOT NULL,
    claim_id BIGINT NOT NULL,
    claim_amount DECIMAL(15, 2) NOT NULL,
    approved_amount DECIMAL(15, 2) NOT NULL,
    deduction_amount DECIMAL(15, 2) DEFAULT 0,
    net_amount DECIMAL(15, 2) NOT NULL,
    CONSTRAINT fk_sc_settlement FOREIGN KEY (settlement_id) REFERENCES settlements(id) ON DELETE CASCADE,
    CONSTRAINT fk_sc_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    CONSTRAINT uk_settlement_claim UNIQUE (settlement_id, claim_id)
);

-- 3. ACCOUNT TRANSACTIONS (المعاملات المالية)
CREATE TABLE IF NOT EXISTS account_transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_number VARCHAR(100) UNIQUE,
    settlement_id BIGINT,
    claim_id BIGINT,
    provider_id BIGINT,
    member_id BIGINT,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('PAYMENT', 'REFUND', 'DEDUCTION', 'ADJUSTMENT', 'OTHER')),
    transaction_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_at_settlement FOREIGN KEY (settlement_id) REFERENCES settlements(id) ON DELETE SET NULL,
    CONSTRAINT fk_at_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE SET NULL,
    CONSTRAINT fk_at_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL,
    CONSTRAINT fk_at_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
);
