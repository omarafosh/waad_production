-- ═══════════════════════════════════════════════════════════════════════════
-- V15: Create Benefit Policy Audit Table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS benefit_policy_audits (
    id BIGSERIAL PRIMARY KEY,
    benefit_policy_id BIGINT NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    notes VARCHAR(500),
    performed_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for faster lookups by policy key
CREATE INDEX IF NOT EXISTS idx_audit_benefit_policy_id ON benefit_policy_audits(benefit_policy_id);

-- Optional: Foreign Key constraint (recommended for integrity)
-- The entity defines it as a Long field, not a ManyToOne relationship, 
-- but at DB level it's good practice to enforce integrity if possible.
-- However, strict auditing sometimes prefers allowing audits to exist even if parent is hard-deleted.
-- Given SoftDelete usage, we can safely add FK.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_benefit_policy') THEN
        ALTER TABLE benefit_policy_audits
        ADD CONSTRAINT fk_audit_benefit_policy
        FOREIGN KEY (benefit_policy_id)
        REFERENCES benefit_policies(id)
        ON DELETE CASCADE;
    END IF;
END $$;
