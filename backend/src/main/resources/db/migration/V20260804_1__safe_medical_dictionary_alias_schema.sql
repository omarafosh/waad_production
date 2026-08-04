-- WAAD V43 safe medical dictionary schema.
-- Non-destructive: legacy ent_service_aliases remains available for review-only matching.

INSERT INTO medical_categories (code,name,active) VALUES
('CAT-ENDOSCOPY','المناظير',TRUE),
('CAT-CARDIO-CHECKUP','فحوصات وتخطيطات القلب',TRUE),
('CAT-PRACT-FEE','رسوم الأطباء والجراحين والمستشارين والممارسين',TRUE),
('CAT-AMBULANCE','الإسعاف المحلي',TRUE),
('CAT-ONCOLOGY','علاج الأورام',TRUE),
('CAT-DIALYSIS','الغسيل الكلوي',TRUE),
('CAT-MAT-NORMAL','الولادة الطبيعية',TRUE),
('CAT-MAT-CS','الولادة القيصرية',TRUE),
('CAT-MAT-COMP','مضاعفات الحمل والولادة',TRUE),
('CAT-DENT-ROUTINE','علاج الأسنان الروتيني',TRUE),
('CAT-DENT-ORTHO','تقويم الأسنان',TRUE),
('CAT-DIAGNOSTIC','الكشوفات الطبية',TRUE),
('CAT-IMG-ADV','التصوير بالرنين المغناطيسي والمقطعي والطبقي',TRUE),
('CAT-SURGERY','العمليات الجراحية',TRUE),
('CAT-ROOM','الإيواء في غرفة خاصة أو قسم',TRUE),
('CAT-ICU','العناية الفائقة',TRUE),
('CAT-CCU','عناية القلب',TRUE),
('CAT-PHYSIO','العلاج الطبيعي',TRUE),
('CAT-THERAPEUTIC-INJ','الحقن العلاجية',TRUE),
('CAT-OPT','النظارات الطبية',TRUE),
('CAT-ANESTHESIA','نفقات التخدير',TRUE),
('CAT-DRUG-GENERAL','أدوية الصرف العام',TRUE),
('CAT-IMG-DIAG','الأشعة والصور التشخيصية',TRUE),
('CAT-LAB','التحاليل الطبية والمختبرات',TRUE),
('CAT-CARDIAC-SURGERY','عمليات القلب والشرايين',TRUE),
('CAT-DENT-PROSTHO','تركيبات الأسنان',TRUE),
('CAT-DME','الأجهزة والمعدات الطبية وفق تقرير الطبيب المختص',TRUE),
('CAT-DAY-CARE','العلاج والرعاية اليومية',TRUE),
('CAT-DENT-EMERG','علاج الأسنان الطارئ للمريض داخل المستشفى',TRUE),
('CAT-HOME-NURSING','التمريض المنزلي أو رعاية النقاهة بعد الخروج',TRUE),
('CAT-EYE-EXAM','كشوفات العيون',TRUE)
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, active=TRUE, updated_at=CURRENT_TIMESTAMP;

WITH concepts(code,name_ar,name_en,cat_code,specialty) AS (VALUES
('WAC-ANES-GA','تخدير عام','General Anesthesia','CAT-ANESTHESIA','ANESTHESIA'),
('WAC-ANES-OTHER','تخدير آخر','Other Anesthesia','CAT-ANESTHESIA','ANESTHESIA'),
('WAC-CARD-PACER','منظم ضربات القلب','Cardiac Pacemaker Procedure','CAT-CARDIAC-SURGERY','CARDIOLOGY'),
('WAC-CARD-VASC','إجراء قلبي أو وعائي متقدم','Advanced Cardiac or Vascular Procedure','CAT-CARDIAC-SURGERY','CARDIOLOGY'),
('WAC-DAY-ASPIRATION','بزل أو شفط علاجي','Therapeutic Aspiration or Puncture','CAT-DAY-CARE','DAY_CARE'),
('WAC-DAY-CATH','تركيب أو تغيير قسطرة أو أنبوب','Catheter or Tube Placement or Change','CAT-DAY-CARE','DAY_CARE'),
('WAC-DAY-IMMOB','تثبيت غير جراحي','Non-surgical Immobilization','CAT-DAY-CARE','DAY_CARE'),
('WAC-DAY-LAVAGE','غسيل أو إرواء علاجي','Therapeutic Lavage or Irrigation','CAT-DAY-CARE','DAY_CARE'),
('WAC-DAY-OTHER','إجراء رعاية يومية آخر','Other Day-care Procedure','CAT-DAY-CARE','DAY_CARE'),
('WAC-DAY-RESUSC','إنعاش قلبي رئوي','Cardiopulmonary Resuscitation','CAT-DAY-CARE','DAY_CARE'),
('WAC-DAY-WOUND','عناية بالجروح والحروق','Wound and Burn Care','CAT-DAY-CARE','DAY_CARE'),
('WAC-DIAG-AUDIO','اختبارات السمع','Audiology Diagnostic Testing','CAT-DIAGNOSTIC','AUDIOLOGY'),
('WAC-DIAG-ECG','تخطيط كهربائية القلب','Electrocardiogram','CAT-CARDIO-CHECKUP','CARDIOLOGY'),
('WAC-DIAG-EMG','تخطيط العضلات والأعصاب','Electromyography and Nerve Conduction','CAT-DIAGNOSTIC','NEUROLOGY'),
('WAC-DIAG-ENDOSCOPY','منظار تشخيصي','Diagnostic Endoscopy','CAT-ENDOSCOPY','ENDOSCOPY'),
('WAC-DIAG-HOLTER','مراقبة هولتر','Holter Monitoring','CAT-CARDIO-CHECKUP','CARDIOLOGY'),
('WAC-DIAG-OTHER','فحص تشخيصي آخر','Other Diagnostic Test','CAT-DIAGNOSTIC','DIAGNOSTIC'),
('WAC-DIAG-PFT','اختبارات وظائف التنفس','Pulmonary Function Testing','CAT-DIAGNOSTIC','PULMONOLOGY'),
('WAC-DIAG-SLEEP','دراسة النوم','Sleep Study','CAT-DIAGNOSTIC','PULMONOLOGY'),
('WAC-DIAL-ACCESS','إنشاء أو تركيب منفذ غسيل كلوي','Dialysis Access Procedure','CAT-DIALYSIS','NEPHROLOGY'),
('WAC-DRUG-IVFLUID','محاليل وسوائل وريدية','Intravenous Fluids','CAT-DRUG-GENERAL','PHARMACY'),
('WAC-DRUG-MED','دواء أو مستحضر صيدلاني','Medication or Pharmaceutical Product','CAT-DRUG-GENERAL','PHARMACY'),
('WAC-FEE-PHYSICIAN','أتعاب طبيب أو ممارس','Physician or Practitioner Fee','CAT-PRACT-FEE','PROFESSIONAL_FEE'),
('WAC-ICU','خدمة العناية الفائقة','Intensive Care Unit Service','CAT-ICU','ICU'),
('WAC-INJ-ADMIN','رسوم إعطاء حقنة دون الدواء','Injection Administration without Drug','CAT-THERAPEUTIC-INJ','INJECTION'),
('WAC-LAB-CHEM','تحاليل الكيمياء السريرية','Clinical Chemistry Tests','CAT-LAB','LABORATORY'),
('WAC-LAB-HEMA','تحاليل أمراض الدم والتخثر','Hematology and Coagulation Tests','CAT-LAB','LABORATORY'),
('WAC-LAB-IMMUNO','تحاليل المناعة والأمصال','Immunology and Serology Tests','CAT-LAB','LABORATORY'),
('WAC-SURG-ENT-OTHER','إجراء جراحي آخر للأنف والأذن والحنجرة','Other ENT Surgical Procedure','CAT-SURGERY','ENT'),
('WAC-SURG-NEURO-OTHER','إجراء جراحة أعصاب آخر','Other Neurosurgical Procedure','CAT-SURGERY','NEUROSURGERY'),
('WAC-SURG-SURG-CIRC','الختان الجراحي','Surgical Circumcision','CAT-SURGERY','SURGERY')
)
INSERT INTO medical_services(code,name_ar,name_en,category_id,category,specialty,status,is_master,active)
SELECT c.code,c.name_ar,c.name_en,mc.id,c.cat_code,c.specialty,'ACTIVE',TRUE,TRUE
FROM concepts c JOIN medical_categories mc ON mc.code=c.cat_code
ON CONFLICT (code) DO UPDATE SET
 name_ar=EXCLUDED.name_ar,
 name_en=EXCLUDED.name_en,
 category_id=EXCLUDED.category_id,
 category=EXCLUDED.category,
 specialty=EXCLUDED.specialty,
 active=TRUE;

CREATE TABLE IF NOT EXISTS medical_service_aliases_v2 (
 id BIGSERIAL PRIMARY KEY,
 alias_id VARCHAR(50) NOT NULL UNIQUE,
 provider_id BIGINT REFERENCES providers(id),
 provider_name_snapshot VARCHAR(200),
 match_scope VARCHAR(30) NOT NULL,
 match_priority INTEGER NOT NULL,
 alias_text VARCHAR(255) NOT NULL,
 alias_normalized VARCHAR(255) NOT NULL,
 provider_code_normalized VARCHAR(120),
 section_normalized VARCHAR(255),
 master_code VARCHAR(255) NOT NULL,
 medical_service_id BIGINT REFERENCES medical_services(id),
 official_cat_code VARCHAR(60) NOT NULL,
 specialty VARCHAR(100),
 confidence NUMERIC(5,4) NOT NULL,
 status VARCHAR(40) NOT NULL,
 auto_approve BOOLEAN NOT NULL DEFAULT FALSE,
 context_rule VARCHAR(80),
 source VARCHAR(100),
 source_action VARCHAR(100),
 standard_name VARCHAR(255),
 reference_text VARCHAR(255),
 notes TEXT,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT ck_med_alias_scope CHECK (match_scope IN ('GLOBAL','PROVIDER','PROVIDER_CODE_CONTEXT')),
 CONSTRAINT ck_med_alias_confidence CHECK (confidence BETWEEN 0 AND 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_med_alias_v2_global_match ON medical_service_aliases_v2
(alias_normalized,COALESCE(provider_code_normalized,''),COALESCE(section_normalized,''))
WHERE match_scope='GLOBAL';
CREATE UNIQUE INDEX IF NOT EXISTS uk_med_alias_v2_provider_snapshot_match ON medical_service_aliases_v2
(match_scope,LOWER(TRIM(provider_name_snapshot)),alias_normalized,COALESCE(provider_code_normalized,''),COALESCE(section_normalized,''))
WHERE match_scope<>'GLOBAL' AND provider_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_med_alias_v2_provider_match ON medical_service_aliases_v2
(match_scope,provider_id,alias_normalized,COALESCE(provider_code_normalized,''),COALESCE(section_normalized,''))
WHERE match_scope<>'GLOBAL' AND provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_med_alias_v2_global ON medical_service_aliases_v2(alias_normalized,match_priority)
WHERE provider_id IS NULL AND status='READY';
CREATE INDEX IF NOT EXISTS idx_med_alias_v2_provider ON medical_service_aliases_v2(provider_id,alias_normalized,match_priority)
WHERE status='READY';
CREATE INDEX IF NOT EXISTS idx_med_alias_v2_code ON medical_service_aliases_v2(provider_id,provider_code_normalized,match_priority)
WHERE status='READY';

CREATE TABLE IF NOT EXISTS medical_service_exclusions (
 id BIGSERIAL PRIMARY KEY,
 exclusion_id VARCHAR(50) NOT NULL UNIQUE,
 alias_text VARCHAR(255) NOT NULL,
 alias_normalized VARCHAR(255) NOT NULL,
 exclusion_type VARCHAR(40) NOT NULL,
 official_cat_code VARCHAR(60),
 confidence NUMERIC(5,4) NOT NULL,
 status VARCHAR(30) NOT NULL,
 reason TEXT,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT ck_med_exclusion_confidence CHECK (confidence BETWEEN 0 AND 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_med_exclusion_norm ON medical_service_exclusions(alias_normalized,exclusion_type);
CREATE INDEX IF NOT EXISTS idx_med_exclusion_lookup ON medical_service_exclusions(alias_normalized,status);

CREATE TABLE IF NOT EXISTS medical_service_split_queue (
 id BIGSERIAL PRIMARY KEY,
 split_id VARCHAR(50) NOT NULL UNIQUE,
 service_text VARCHAR(500) NOT NULL,
 service_normalized VARCHAR(500) NOT NULL,
 medical_specialty VARCHAR(100),
 status VARCHAR(30) NOT NULL,
 confidence NUMERIC(5,4) NOT NULL,
 providers TEXT,
 reason TEXT,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT ck_med_split_confidence CHECK (confidence BETWEEN 0 AND 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_med_split_norm ON medical_service_split_queue(service_normalized);
CREATE INDEX IF NOT EXISTS idx_med_split_lookup ON medical_service_split_queue(service_normalized,status);

CREATE TABLE IF NOT EXISTS medical_dictionary_import_audit (
 id BIGSERIAL PRIMARY KEY,
 patch_version VARCHAR(30) NOT NULL,
 record_type VARCHAR(30) NOT NULL,
 record_key VARCHAR(255) NOT NULL,
 issue_type VARCHAR(60) NOT NULL,
 details TEXT,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
