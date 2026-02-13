-- ═══════════════════════════════════════════════════════════════════════════
-- V10: INFRASTRUCTURE & AUDIT SYSTEM (البنية التحتية ونظام التدقيق)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. APPROVAL REQUESTS (طلبات الموافقة)
CREATE TABLE IF NOT EXISTS approval_requests (
    id BIGSERIAL PRIMARY KEY,
    request_number VARCHAR(100) UNIQUE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'ACTIVATE', 'SUSPEND', 'TERMINATE')),
    description TEXT,
    changes JSONB,
    requested_by VARCHAR(100) NOT NULL,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. LIFECYCLE REASON CODES (أكواد الأسباب)
CREATE TABLE IF NOT EXISTS lifecycle_reason_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('SUSPENSION', 'TERMINATION', 'CANCELLATION', 'REJECTION', 'ACTIVATION')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- 3. BENEFIT POLICY AUDIT (تدقيق السياسات)
CREATE TABLE IF NOT EXISTS benefit_policy_audit (
    id BIGSERIAL PRIMARY KEY,
    benefit_policy_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('CREATED', 'UPDATED', 'ACTIVATED', 'SUSPENDED', 'EXPIRED', 'TERMINATED', 'CANCELLED', 'ARCHIVED', 'DELETED', 'RESTORED')),
    reason VARCHAR(500),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    performed_by VARCHAR(100) NOT NULL,
    CONSTRAINT fk_audit_policy FOREIGN KEY (benefit_policy_id) REFERENCES benefit_policies(id) ON DELETE CASCADE
);
