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
    code VARCHAR(50) NOT NULL UNIQUE,     -- رمز التصنيف (مثلاً: LAB, RADIO, CONSULT)
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

-- 2. الخدمات الطبية الموحدة (Unified Medical Services)
-- القاموس المرجعي للنظام. تم دمج medical_services مع ent_medical_services.
CREATE TABLE IF NOT EXISTS medical_services (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(255) NOT NULL UNIQUE,      -- كود الخدمة الموحد
    name_ar VARCHAR(200) NOT NULL,          -- اسم الخدمة بالعربي
    name_en VARCHAR(200),                   -- اسم الخدمة بالإنجليزي
    
    -- التصنيف والتقسيم
    category_id BIGINT,                     -- رابط التصنيف الطبي (ID)
    category VARCHAR(255),                  -- اسم التصنيف (للتوافق مع الكود القديم)
    sub_category VARCHAR(255),              -- التصنيف الفرعي
    specialty VARCHAR(255),                 -- التخصص المرتبط
    
    description VARCHAR(500),               -- وصف إضافي
    status VARCHAR(20) DEFAULT 'ACTIVE',    -- حالة الخدمة (ACTIVE, DRAFT)
    
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

-- 3. المجموعات الطبية (Medical Packages)
-- تجميع لمجموعة خدمات تحت كود واحد (الباقات)
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

-- 4. تفاصيل المجموعات الطبية (Medical Package Items)
CREATE TABLE IF NOT EXISTS medical_package_items (
    id BIGSERIAL PRIMARY KEY,
    package_id BIGINT NOT NULL,
    service_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_mpi_package FOREIGN KEY (package_id) REFERENCES medical_packages(id) ON DELETE CASCADE,
    CONSTRAINT fk_mpi_service FOREIGN KEY (service_id) REFERENCES medical_services(id)
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
