-- ═══════════════════════════════════════════════════════════════════════════
-- V42: Coverage Rule Templates (Packages)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create Templates Table
CREATE TABLE benefit_rule_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,  -- System templates cannot be deleted
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create Template Items (Rules within the template)
CREATE TABLE benefit_rule_template_items (
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
('تغطية الصيدلية والأدوية', 'قالب مخصص لتغطية الأدوية والوصفات الطبية فقط', TRUE);

-- 4. Seed Items for "Standard" Template (Assuming id 1)
-- OPD: 80%, ER: 100%, LAB: 80%, RAD: 80%
INSERT INTO benefit_rule_template_items (template_id, encounter_type, coverage_percent) 
VALUES 
(1, 'OUTPATIENT', 80.00),
(1, 'EMERGENCY', 100.00),
(1, 'LABORATORY', 80.00),
(1, 'RADIOLOGY', 80.00),
(1, 'PHARMACY', 60.00);

-- 5. Seed Items for "VIP" Template (Assuming id 2)
INSERT INTO benefit_rule_template_items (template_id, encounter_type, coverage_percent) 
VALUES 
(2, 'OUTPATIENT', 100.00),
(2, 'INPATIENT', 100.00),
(2, 'EMERGENCY', 100.00),
(2, 'LABORATORY', 100.00),
(2, 'RADIOLOGY', 100.00),
(2, 'PHARMACY', 80.00),
(2, 'DENTAL', 80.00),
(2, 'PHYSIOTHERAPY', 80.00);

-- 6. Seed Items for "Pharmacy" Template (Assuming id 3)
INSERT INTO benefit_rule_template_items (template_id, encounter_type, coverage_percent, medical_category_code) 
VALUES 
(3, 'PHARMACY', 80.00, 'CAT-PHARM');
