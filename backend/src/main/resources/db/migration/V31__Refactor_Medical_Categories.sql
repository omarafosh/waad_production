-- Refactor Medical Categories to exactly 8 specific types
-- This ensures the system only uses the categories requested by the user

-- 1. Clear existing categories
DELETE FROM medical_categories;

-- 2. Insert the 8 specific categories from the provided image
INSERT INTO medical_categories (code, name, active, created_at, updated_at) VALUES 
('CAT-OP', 'عمليات', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('CAT-IN', 'إيواء', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('CAT-OUT', 'عيادات خارجية', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('CAT-LAB', 'تحاليل طبية', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('CAT-DENT-PREV', 'اسنان وقائي', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('CAT-DENT-COSM', 'اسنان تجميلي', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('CAT-RAD', 'اشعة', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('CAT-PHYS', 'علاج طبيعي', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. Insert Sub-Categories linked to Main Categories

-- 3.1 Operations Sub-Categories
INSERT INTO medical_categories (code, name, active, parent_id, created_at, updated_at)
SELECT 'SUB-OP-GEN', 'الجراحة العامة', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-ORTHO', 'جراحة العظام', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-MAXILLO', 'جراحة الوجه والفكين', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-URO', 'جراحة المسالك والأمراض التناسلية', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-NEURO', 'جراحة المخ والأعصاب', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-CARDIO', 'جراحة القلب', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-THORACIC', 'جراحة الصدر', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-PED', 'جراحة الأطفال', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-PLASTIC', 'جراحة التجميل', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-JOINT', 'عمليات المفاصل', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-SOFT', 'عمليات الانسجه الرخوه', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-SHOULDER', 'عمليات الكتف', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-PED-ORTHO', 'عمليات عظام الاطفال والتشوهات الخلقيه', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-ENDO', 'المناظير', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-LITHO', 'تفتيت حصوات الكلى', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OP';

-- 3.2 Inpatient Sub-Categories
INSERT INTO medical_categories (code, name, active, parent_id, created_at, updated_at)
SELECT 'SUB-IN-ICU', 'خدمات الرعاية بالعناية المركزه', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-IN'
UNION ALL SELECT 'SUB-IN-ADMIT', 'خدمات الايواء', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-IN'
UNION ALL SELECT 'SUB-IN-ANESTHESIA', 'التخدير', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-IN'
UNION ALL SELECT 'SUB-IN-CARE', 'خدمات الرعايه الطبيه', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-IN'
UNION ALL SELECT 'SUB-IN-ANESTHESIA-ICU', 'تخدير وعناية فائقة', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-IN';

-- 3.3 Outpatient Sub-Categories
INSERT INTO medical_categories (code, name, active, parent_id, created_at, updated_at)
SELECT 'SUB-OUT-CONSULT', 'الكشف و الاستشارات الطبية', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OUT'
UNION ALL SELECT 'SUB-OUT-SERVICES', 'خدمات العيادات الخارجية', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OUT'
UNION ALL SELECT 'SUB-OUT-ER', 'خدمات الطوارئ', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OUT'
UNION ALL SELECT 'SUB-OUT-OPHTHO', 'أمراض العيون', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OUT'
UNION ALL SELECT 'SUB-OUT-ENT', 'أنف وأذن وحنجرة', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OUT'
UNION ALL SELECT 'SUB-OUT-OBGYN', 'النساء وولادة', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OUT'
UNION ALL SELECT 'SUB-OUT-FERTILITY', 'العقم و الخصوبة', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OUT'
UNION ALL SELECT 'SUB-OUT-GASTRO', 'الجهاز الهضمي والمناظير', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OUT'
UNION ALL SELECT 'SUB-OUT-DIALYSIS', 'خدمات غسيل الُكلى', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-OUT';

-- 3.4 Laboratory Sub-Categories
INSERT INTO medical_categories (code, name, active, parent_id, created_at, updated_at)
SELECT 'SUB-LAB-MAIN', 'معامل', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-LAB'
UNION ALL SELECT 'SUB-LAB-TESTS', 'معمل التحاليل', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-LAB'
UNION ALL SELECT 'SUB-LAB-PATH', 'علم الامراض', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-LAB';

-- 3.5 Radiology Sub-Categories
INSERT INTO medical_categories (code, name, active, parent_id, created_at, updated_at)
SELECT 'SUB-RAD-XRAY', 'اشعة', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-RAD'
UNION ALL SELECT 'SUB-RAD-DIGITAL', 'التصويربالأشعه الرقميه', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-RAD'
UNION ALL SELECT 'SUB-RAD-DIAG', 'خدمات الصور التشخيصية', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-RAD'
UNION ALL SELECT 'SUB-RAD-US', 'خدمات الموجات الفوق صوتية', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-RAD'
UNION ALL SELECT 'SUB-RAD-NEURO', 'خدمات تخطيط العصب', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-RAD';

-- 3.6 Preventive Dentistry Sub-Categories
INSERT INTO medical_categories (code, name, active, parent_id, created_at, updated_at)
SELECT 'SUB-DENT-SERV', 'خدمات الأسنان', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-DENT-PREV'
UNION ALL SELECT 'SUB-DENT-GEN', 'الأسنان', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-DENT-PREV'
UNION ALL SELECT 'SUB-DENT-PREV', 'اسنان وقائي', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-DENT-PREV';

-- 3.7 Cosmetic Dentistry Sub-Categories
INSERT INTO medical_categories (code, name, active, parent_id, created_at, updated_at)
SELECT 'SUB-DENT-COSM', 'اسنان تجميلي', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-DENT-COSM'
UNION ALL SELECT 'SUB-DENT-ORTHO', 'تقويم الأسنان', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-DENT-COSM'
UNION ALL SELECT 'SUB-DENT-IMPLANT', 'زراعة الأسنان', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-DENT-COSM';

-- 3.8 Physical Therapy Sub-Categories
INSERT INTO medical_categories (code, name, active, parent_id, created_at, updated_at)
SELECT 'SUB-PHYS-SERV', 'خدمات العلاج الطبيعي', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-PHYS'
UNION ALL SELECT 'SUB-PHYS-REHAB', 'إعادة التأهيل', TRUE, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM medical_categories WHERE code = 'CAT-PHYS';


-- 4. Reset references in ent_medical_services if needed
-- We keep the category names in the services for now as they are String-based, 
-- but we nullify category_id since old IDs are gone.
UPDATE medical_services SET category_id = NULL;
