-- 1. Ensure testing Medical Categories exist
INSERT INTO medical_categories (code, name) VALUES 
('DENTAL', 'طب الأسنان (Dental)'),
('OPTICAL', 'البصريات (Optical)'),
('LAB', 'المختبرات والتحاليل (Laboratory)'),
('PHARMACY', 'الصيدلة والأدوية (Pharmacy)')
ON CONFLICT (code) DO NOTHING;

-- 1.1 Ensure testing Organizations exist (Fix for missing 'type' column)
INSERT INTO organizations (name, code, active) VALUES 
('شركة التقنية المحدودة (Tech Solutions)', 'TECH-SOL', TRUE),
('مجموعة الخليج للتأمين (GIG)', 'GIG', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 2. Create a Test Policy with Segregated Limits
INSERT INTO benefit_policies (
    name, policy_code, description, 
    employer_org_id, insurance_org_id, 
    start_date, end_date, 
    annual_limit, per_member_limit,
    distribution_type, status, active
) VALUES (
    'وثيقة النخبة - حدود منفصلة (Elite Segregated)', 'POL-ELITE-001', 
    'وثيقة ميزتها توزيع السقوف المالية بشكل مستقل لكل تخصص طبي.',
    (SELECT id FROM organizations WHERE code = 'TECH-SOL' LIMIT 1),
    (SELECT id FROM organizations WHERE code = 'GIG' LIMIT 1),
    '2024-01-01', '2024-12-31',
    100000.00, 50000.00,
    'DISTRIBUTED', 'ACTIVE', TRUE
) ON CONFLICT DO NOTHING;

-- 3. Seed Distributions for the Elite Policy
INSERT INTO coverage_distributions (
    benefit_policy_id, medical_category_id, limit_amount, active
)
SELECT 
    p.id, 
    c.id, 
    CASE c.code 
        WHEN 'DENTAL' THEN 2000.00
        WHEN 'OPTICAL' THEN 500.00
        WHEN 'PHARMACY' THEN 5000.00
        ELSE 1000.00
    END,
    TRUE
FROM benefit_policies p
JOIN medical_categories c ON c.code IN ('DENTAL', 'OPTICAL', 'PHARMACY')
WHERE p.policy_code = 'POL-ELITE-001'
ON CONFLICT DO NOTHING;
