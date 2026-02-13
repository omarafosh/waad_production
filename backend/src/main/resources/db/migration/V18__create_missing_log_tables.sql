-- ═══════════════════════════════════════════════════════════════════════════
-- V18: Create Missing Log and Audit Tables (Comprehensive)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create lifecycle_logs table (Missing, caused startup error)
CREATE TABLE IF NOT EXISTS lifecycle_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(255) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(255) NOT NULL,
    previous_status VARCHAR(255),
    new_status VARCHAR(255),
    reason_code VARCHAR(255),
    reason_details VARCHAR(1000),
    performed_by VARCHAR(255),
    performed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_entity ON lifecycle_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_action ON lifecycle_logs(action);


-- 2. Create member_import_logs table (Likely missing)
CREATE TABLE IF NOT EXISTS member_import_logs (
    id BIGSERIAL PRIMARY KEY,
    import_batch_id VARCHAR(64) NOT NULL UNIQUE,
    file_name VARCHAR(500),
    file_size_bytes BIGINT,
    total_rows INTEGER DEFAULT 0,
    created_count INTEGER DEFAULT 0,
    updated_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    status VARCHAR(30) NOT NULL,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    processing_time_ms BIGINT,
    imported_by_user_id BIGINT,
    imported_by_username VARCHAR(100),
    company_scope_id BIGINT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP
);


-- 3. Create audit_logs table (Likely missing, for SystemAdmin module)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    user_id BIGINT,
    username VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id BIGINT,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);


-- 4. Create claim_audit_logs table (Ensure existence)
CREATE TABLE IF NOT EXISTS claim_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_by VARCHAR(100),
    changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    comments VARCHAR(500)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_claim_audit_logs_claim') THEN
        ALTER TABLE claim_audit_logs
        ADD CONSTRAINT fk_claim_audit_logs_claim
        FOREIGN KEY (claim_id)
        REFERENCES claims(id)
        ON DELETE CASCADE;
    END IF;
END $$;
