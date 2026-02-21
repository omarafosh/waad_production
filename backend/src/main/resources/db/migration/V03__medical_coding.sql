-- ═══════════════════════════════════════════════════════════════════════════
-- 03. القاموس الطبي الموحد (Unified Medical Dictionary)
-- ═══════════════════════════════════════════════════════════════════════════
-- هذا الملف ينشئ الهيكلية الأساسية لتصنيف الخدمات الطبية والتي تُستخدم
-- كمرجع (Mapping) لخدمات الشركات ومقدمي الخدمة لتحديد السياسة وتغطية التأمين.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. تصنيفات الخدمات الطبية (Medical Categories)
-- تُستخدم لتجميع الخدمات (مثلاً: مختبر، أشعة، استشارة) وتحديد التغطية على مستوى التصنيف.
CREATE TABLE IF NOT EXISTS medical_categories (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,     -- رمز التصنيف (مثلاً: CAT-LAB, CAT-OUT)
    name VARCHAR(200) NOT NULL,            -- اسم التصنيف بالعربي
    parent_id BIGINT,                      -- التسلسل الهرمي (اختياري)
    active BOOLEAN NOT NULL DEFAULT TRUE,  -- حالة النشاط
    
    -- بيانات المراجعة (Audit)
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- الحذف الناعم (Soft Delete)
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES medical_categories(id)
);

COMMENT ON TABLE medical_categories IS 'قاموس تصنيفات الخدمات الطبية - المفتاح الأساسي لتحديد قواعد التغطية';
COMMENT ON COLUMN medical_categories.code IS 'كود فريد للتصنيف يستخدم في محرك القواعد';

CREATE INDEX IF NOT EXISTS idx_categories_parent ON medical_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON medical_categories(active);

-- ═══════════════════════════════════════════════════════════════════════════
-- البيانات الأساسية للتصنيفات (Seed Categories) - تم التحديث لـ 8 أصناف أساسية مع أصنافها الفرعية
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO medical_categories (code, name) VALUES 
('CAT-OP', 'عمليات'),
('CAT-IN', 'إيواء'),
('CAT-OUT', 'عيادات خارجية'),
('CAT-LAB', 'تحاليل طبية'),
('CAT-DENT-PREV', 'اسنان وقائي'),
('CAT-DENT-COSM', 'اسنان تجميلي'),
('CAT-RAD', 'اشعة'),
('CAT-PHYS', 'علاج طبيعي')
ON CONFLICT (code) DO NOTHING;

-- الفرعية (Operations)
INSERT INTO medical_categories (code, name, parent_id)
SELECT 'SUB-OP-GEN', 'الجراحة العامة', id FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-ORTHO', 'جراحة العظام', id FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-MAXILLO', 'جراحة الوجه والفكين', id FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-URO', 'جراحة المسالك والأمراض التناسلية', id FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-NEURO', 'جراحة المخ والأعصاب', id FROM medical_categories WHERE code = 'CAT-OP'
UNION ALL SELECT 'SUB-OP-CARDIO', 'جراحة القلب', id FROM medical_categories WHERE code = 'CAT-OP'
ON CONFLICT (code) DO NOTHING;

-- الفرعية (Inpatient)
INSERT INTO medical_categories (code, name, parent_id)
SELECT 'SUB-IN-ICU', 'خدمات الرعاية بالعناية المركزه', id FROM medical_categories WHERE code = 'CAT-IN'
UNION ALL SELECT 'SUB-IN-ADMIT', 'خدمات الايواء', id FROM medical_categories WHERE code = 'CAT-IN'
UNION ALL SELECT 'SUB-IN-ANESTHESIA', 'التخدير', id FROM medical_categories WHERE code = 'CAT-IN'
ON CONFLICT (code) DO NOTHING;

-- الفرعية (Outpatient)
INSERT INTO medical_categories (code, name, parent_id)
SELECT 'SUB-OUT-CONSULT', 'الكشف و الاستشارات الطبية', id FROM medical_categories WHERE code = 'CAT-OUT'
UNION ALL SELECT 'SUB-OUT-SERVICES', 'خدمات العيادات الخارجية', id FROM medical_categories WHERE code = 'CAT-OUT'
UNION ALL SELECT 'SUB-OUT-ER', 'خدمات الطوارئ', id FROM medical_categories WHERE code = 'CAT-OUT'
ON CONFLICT (code) DO NOTHING;

-- الفرعية (Laboratory)
INSERT INTO medical_categories (code, name, parent_id)
SELECT 'SUB-LAB-MAIN', 'معامل', id FROM medical_categories WHERE code = 'CAT-LAB'
UNION ALL SELECT 'SUB-LAB-TESTS', 'معمل التحاليل', id FROM medical_categories WHERE code = 'CAT-LAB'
ON CONFLICT (code) DO NOTHING;

-- 2. الخدمات الطبية الموحدة (Unified Medical Services)
-- القاموس المرجعي للنظام. تم دمج medical_services مع ent_medical_services.
CREATE TABLE IF NOT EXISTS medical_services (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(255) NOT NULL UNIQUE,      -- كود الخدمة الموحد
    name_ar VARCHAR(200) NOT NULL,          -- اسم الخدمة بالعربي
    name_en VARCHAR(200),                   -- اسم الخدمة بالإنجليزي
    
    -- التصنيف والتقسيم (ملاحظة: category_id سيبقى للتوافق لكن الربط الأساسي عبر جدول الوصل)
    category_id BIGINT,                     -- رابط التصنيف الطبي الافتراضي
    category VARCHAR(255),                  -- اسم التصنيف (نصي)
    sub_category VARCHAR(255),              -- التصنيف الفرعي
    specialty VARCHAR(255),                 -- التخصص المرتبط
    
    description VARCHAR(500),               -- وصف إضافي
    status VARCHAR(20) DEFAULT 'ACTIVE',    -- حالة الخدمة (ACTIVE, DRAFT)
    base_price DECIMAL(15, 2) DEFAULT 0.00, -- السعر الأساسي
    cost DECIMAL(15, 2) DEFAULT 0.00,       -- التكلفة
    
    is_master BOOLEAN NOT NULL DEFAULT TRUE, -- هل الخدمة جزء من القاموس المرجعي؟
    active BOOLEAN NOT NULL DEFAULT TRUE,    -- حالة النشاط (Soft Delete flag)
    
    -- بيانات المراجعة (Audit)
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- الحذف الناعم (Soft Delete)
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    
    CONSTRAINT fk_service_category FOREIGN KEY (category_id) REFERENCES medical_categories(id)
);

COMMENT ON TABLE medical_services IS 'القاموس الطبي الموحد - الخدمات المرجعية للنظام';
COMMENT ON COLUMN medical_services.category_id IS 'الربط بالتصنيف الطبي لتحديد نسب التحمل والتغطية';

CREATE INDEX IF NOT EXISTS idx_services_category ON medical_services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON medical_services(active);

-- 3. الربط المتعدد (Medical Service Categories - Junction Table)
-- الغرض: دعم ربط الخدمة الواحدة بعدة تصنيفات (Many-to-Many) بحسب سياق التغطية
CREATE TABLE IF NOT EXISTS medical_service_categories (
    id          BIGSERIAL PRIMARY KEY,
    service_id  BIGINT NOT NULL REFERENCES medical_services(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES medical_categories(id),
    
    -- is_primary: يحدد التصنيف الأساسي للخدمة (للتوافق مع الأنظمة القديمة)
    is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- context: متى ينطبق هذا التصنيف (ANY, OUTPATIENT, INPATIENT, EMERGENCY)
    context     VARCHAR(20) NOT NULL DEFAULT 'ANY', -- ANY, OUTPATIENT, INPATIENT, EMERGENCY
    
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- قيد فريد لمنع تكرار الربط لنفس السياق
    CONSTRAINT uk_service_category_context UNIQUE (service_id, category_id, context)
);

CREATE INDEX IF NOT EXISTS idx_svc_cat_service ON medical_service_categories(service_id);
CREATE INDEX IF NOT EXISTS idx_svc_cat_category ON medical_service_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_svc_cat_context ON medical_service_categories(context);

COMMENT ON TABLE medical_service_categories IS 'جدول الربط المتعدد بين الخدمات والتصنيفات لدعم التغطية بحسب السياق';
COMMENT ON COLUMN medical_service_categories.context IS 'السياق الذي ينطبق فيه هذا التصنيف (خارجي، داخلي، طوارئ)';

-- ═══════════════════════════════════════════════════════════════════════════
-- ترميم الروابط (Data Restoration Logic from V36)
-- ═══════════════════════════════════════════════════════════════════════════
-- استعادة الربط بين الخدمات والتصنيفات بناءً على حقل النص legacy 'category'
UPDATE medical_services ms
SET category_id = mc.id
FROM medical_categories mc
WHERE UPPER(ms.category) = mc.code
  AND ms.category_id IS NULL;

-- تهيئة جدول الربط المتعدد
INSERT INTO medical_service_categories (service_id, category_id, is_primary, context)
SELECT id, category_id, TRUE, 'ANY'
FROM medical_services
WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. المجموعات الطبية (Medical Packages)
CREATE TABLE IF NOT EXISTS medical_packages (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS medical_package_items (
    id BIGSERIAL PRIMARY KEY,
    package_id BIGINT NOT NULL REFERENCES medical_packages(id) ON DELETE CASCADE,
    service_id BIGINT NOT NULL REFERENCES medical_services(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. الأكواد العالمية (CPT & ICD) 
-- تبقى كمرجع إضافي عند الحاجة للترميز العالمي
CREATE TABLE IF NOT EXISTS cpt_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    description_ar VARCHAR(500) NOT NULL,
    description_en VARCHAR(500) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS icd_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    description_ar VARCHAR(500) NOT NULL,
    description_en VARCHAR(500) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Service Aliases (For better auto-mapping)
CREATE TABLE IF NOT EXISTS ent_service_aliases (
    id BIGSERIAL PRIMARY KEY,
    alias_text VARCHAR(255) NOT NULL,
    medical_service_id BIGINT NOT NULL REFERENCES medical_services(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ent_service_aliases_text ON ent_service_aliases(alias_text);

-- Seed basic data
INSERT INTO medical_services (code, name_ar, name_en, category) 
VALUES ('SRV-LAB-CBC', 'تحليل دم شامل', 'Complete Blood Count (CBC)', 'LAB')
ON CONFLICT (code) DO NOTHING;
