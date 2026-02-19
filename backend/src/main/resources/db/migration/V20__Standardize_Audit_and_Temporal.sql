-- ═══════════════════════════════════════════════════════════════════════════
-- V20. معايير التدقيق والارتباط المعماري (Audit & Architectural Standards)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. جدول المنظمات (Organizations)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP,
ADD COLUMN IF NOT EXISTS valid_to TIMESTAMP;

-- 2. جدول الخدمات الطبية (Medical Services)
-- التأكد من وجود أعمدة التدقيق والارتباط الزمني
ALTER TABLE medical_services 
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP,
ADD COLUMN IF NOT EXISTS valid_to TIMESTAMP;

-- 3. جداول الربط (Junction Tables)
-- إضافة أعمدة التدقيق لجدول الربط بين الخدمات والتصنيفات
ALTER TABLE medical_service_categories 
ADD COLUMN IF NOT EXISTS created_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- 4. توحيد منطق الحذف الناعم في Members
-- تحديث الأعمدة لتتبع معيار SoftDeleteEntity
UPDATE members SET active = FALSE WHERE deleted = TRUE;
-- العمود active موجود مسبقاً في V05، لكننا نضمن المزامنة هنا.
