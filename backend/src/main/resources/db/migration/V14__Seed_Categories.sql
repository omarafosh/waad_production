-- ═══════════════════════════════════════════════════════════════════════════
-- V14: Seed Additional Categories (Unified from V39)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO medical_categories (code, name) VALUES 
('CAT-PHARM', 'صيدلية'),
('CAT-OPT', 'بصريات')
ON CONFLICT (code) DO NOTHING;

-- Initialize sub-categories as well to ensure hierarchy exists
INSERT INTO medical_categories (code, name, parent_id) 
SELECT 'SUB-PHARM-GEN', 'أدوية عامة', id FROM medical_categories WHERE code = 'CAT-PHARM'
ON CONFLICT (code) DO NOTHING;

INSERT INTO medical_categories (code, name, parent_id) 
SELECT 'SUB-OPT-GLASSES', 'نظارات', id FROM medical_categories WHERE code = 'CAT-OPT'
ON CONFLICT (code) DO NOTHING;
