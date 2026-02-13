-- ═══════════════════════════════════════════════════════════════════════════
-- V19: Create Lifecycle Reason Codes Table (Corrected)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lifecycle_reason_codes (
    -- Entity uses 'Integer id', so we use SERIAL (4 bytes), not BIGSERIAL
    id SERIAL PRIMARY KEY,
    
    code VARCHAR(50) NOT NULL UNIQUE,
    
    -- Entity fields: labelAr, labelEn
    label_ar VARCHAR(200) NOT NULL,
    label_en VARCHAR(200),
    
    -- Arrays for applicable contexts
    applicable_entities TEXT[],
    applicable_actions TEXT[],
    
    -- Active flag
    active BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Auditing
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- Indexes (Optional but good practice)
CREATE INDEX IF NOT EXISTS idx_reason_code_active ON lifecycle_reason_codes(active);

-- Seed initial data
INSERT INTO lifecycle_reason_codes (code, label_ar, label_en, active, created_at)
VALUES 
('OTHER', 'أخرى', 'Other', true, NOW())
ON CONFLICT (code) DO NOTHING;
