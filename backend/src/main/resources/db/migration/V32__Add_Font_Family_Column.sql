-- ═══════════════════════════════════════════════════════════════════════════
-- V32: إضافة عمود نوع الخط (font_family)
-- ═══════════════════════════════════════════════════════════════════════════
-- الغرض: ضمان وجود عمود font_family في جدول settings لتجنب أخطاء 500
-- السبب: قد يكون الجدول منشأ مسبقاً بنسخة قديمة من V02 لا تحتوي على هذا العمود
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ 
BEGIN 
    -- التحقق مما إذا كان العمود موجوداً مسبقاً لتجنب الأخطاء
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'settings' AND column_name = 'font_family') THEN
        
        -- إضافة العمود مع قيمة افتراضية
        ALTER TABLE settings 
        ADD COLUMN font_family VARCHAR(50) DEFAULT 'Cairo';
        
        RAISE NOTICE 'Added font_family column to settings table';
    ELSE 
        RAISE NOTICE 'Column font_family already exists in settings table';
    END IF;

    -- تحديث القيمة الافتراضية للسجلات الموجودة (إذا كانت NULL)
    UPDATE settings 
    SET font_family = 'Cairo' 
    WHERE font_family IS NULL OR font_family = '';

END $$;
