-- ═══════════════════════════════════════════════════════════════════════════
-- V17: Create Missing History Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create entity_history table
CREATE TABLE IF NOT EXISTS entity_history (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(20) NOT NULL, -- CREATE, UPDATE, DELETE
    correlation_id VARCHAR(36),
    changes_json TEXT,
    version BIGINT,
    performed_by VARCHAR(100),
    performed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for entity_history
CREATE INDEX IF NOT EXISTS idx_entity_history_lookup ON entity_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_history_correlation ON entity_history(correlation_id);


-- 2. Create member_workflow_history table
-- Found as an Entity but likely missing in DB as well.
CREATE TABLE IF NOT EXISTS member_workflow_history (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    changed_at TIMESTAMP NOT NULL,
    changed_by VARCHAR(100),
    reason VARCHAR(255)
);

-- Foreign Key for member_workflow_history
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_member_workflow_history_member') THEN
        ALTER TABLE member_workflow_history
        ADD CONSTRAINT fk_member_workflow_history_member
        FOREIGN KEY (member_id)
        REFERENCES members(id)
        ON DELETE CASCADE;
    END IF;
END $$;
