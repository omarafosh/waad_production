-- 11. Workflow Approvals

CREATE TABLE approval_requests (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(255) NOT NULL,
    entity_id BIGINT,
    action VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL,
    maker_user VARCHAR(255) NOT NULL,
    checker_user VARCHAR(255),
    maker_notes TEXT,
    checker_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_entity ON approval_requests(entity_type, entity_id);