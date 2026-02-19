-- ═══════════════════════════════════════════════════════════════════════════
-- V15: Coverage Rule Templates (Unified from V42)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create Templates Table
CREATE TABLE IF NOT EXISTS benefit_rule_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,  -- System templates cannot be deleted
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create Template Items (Rules within the template)
CREATE TABLE IF NOT EXISTS benefit_rule_template_items (
    id BIGSERIAL PRIMARY KEY,
    template_id BIGINT NOT NULL REFERENCES benefit_rule_templates(id) ON DELETE CASCADE,
    encounter_type VARCHAR(30) NOT NULL,
    medical_category_code VARCHAR(50),  -- Optional: Specific category code
    coverage_percent NUMERIC(5,2),
    times_limit INTEGER,
    waiting_period_days INTEGER DEFAULT 0,
    requires_pre_approval BOOLEAN DEFAULT FALSE,
    notes TEXT
);

-- 3. Seed Initial System Templates
INSERT INTO benefit_rule_templates (name, description, is_system) VALUES 
('التغطية الأساسية (Standard)', 'تغطية متوازنة لخدمات العيادات والطوارئ والفحوصات الأساسية بنسبة 80%', TRUE),
('التغطية الشاملة (VIP)', 'تغطية عالية لجميع الخدمات تشمل الأسنان والبصريات بنسبة 100% للعيادات والطوارئ', TRUE),
('تغطية الصيدلية والأدوية', 'قالب مخصص لتغطية الأدوية والوصفات الطبية فقط', TRUE)
ON CONFLICT (id) DO NOTHING; -- Assuming ID won't conflict, logic needs to be safe

-- 4. Seed Items for "Standard" Template
-- (Using subqueries to find template ID by name to be safe)
INSERT INTO benefit_rule_template_items (template_id, encounter_type, coverage_percent) 
SELECT id, 'OUTPATIENT', 80.00 FROM benefit_rule_templates WHERE name = 'التغطية الأساسية (Standard)'
UNION ALL
SELECT id, 'EMERGENCY', 100.00 FROM benefit_rule_templates WHERE name = 'التغطية الأساسية (Standard)'
UNION ALL
SELECT id, 'LABORATORY', 80.00 FROM benefit_rule_templates WHERE name = 'التغطية الأساسية (Standard)'
UNION ALL
SELECT id, 'RADIOLOGY', 80.00 FROM benefit_rule_templates WHERE name = 'التغطية الأساسية (Standard)'
UNION ALL
SELECT id, 'PHARMACY', 60.00 FROM benefit_rule_templates WHERE name = 'التغطية الأساسية (Standard)';

-- 5. Seed Items for "VIP" Template
INSERT INTO benefit_rule_template_items (template_id, encounter_type, coverage_percent) 
SELECT id, 'OUTPATIENT', 100.00 FROM benefit_rule_templates WHERE name = 'التغطية الشاملة (VIP)'
UNION ALL
SELECT id, 'INPATIENT', 100.00 FROM benefit_rule_templates WHERE name = 'التغطية الشاملة (VIP)'
UNION ALL
SELECT id, 'EMERGENCY', 100.00 FROM benefit_rule_templates WHERE name = 'التغطية الشاملة (VIP)'
UNION ALL
SELECT id, 'LABORATORY', 100.00 FROM benefit_rule_templates WHERE name = 'التغطية الشاملة (VIP)'
UNION ALL
SELECT id, 'RADIOLOGY', 100.00 FROM benefit_rule_templates WHERE name = 'التغطية الشاملة (VIP)'
UNION ALL
SELECT id, 'PHARMACY', 80.00 FROM benefit_rule_templates WHERE name = 'التغطية الشاملة (VIP)'
UNION ALL
SELECT id, 'DENTAL', 80.00 FROM benefit_rule_templates WHERE name = 'التغطية الشاملة (VIP)'
UNION ALL
SELECT id, 'PHYSIOTHERAPY', 80.00 FROM benefit_rule_templates WHERE name = 'التغطية الشاملة (VIP)';

-- 6. Seed Items for "Pharmacy" Template
INSERT INTO benefit_rule_template_items (template_id, encounter_type, coverage_percent, medical_category_code) 
SELECT id, 'PHARMACY', 80.00, 'CAT-PHARM' FROM benefit_rule_templates WHERE name = 'تغطية الصيدلية والأدوية';
