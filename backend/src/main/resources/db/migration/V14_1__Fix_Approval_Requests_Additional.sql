-- V13: Fix Approval Requests Schema
-- robustly handling both "missing table" and "missing column" scenarios

-- 1. Create table if it doesn't exist
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

-- 2. Ensure 'action' column exists (if table existed but was old)
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS action VARCHAR(50);
