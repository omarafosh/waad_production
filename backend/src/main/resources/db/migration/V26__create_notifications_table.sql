-- ═══════════════════════════════════════════════════════════════════════════
-- V26: Create Notifications Table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    reference_id BIGINT,
    reference_type VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,

    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
