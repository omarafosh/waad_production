-- ═══════════════════════════════════════════════════════════════════════════
-- V19. توحيد دورة حياة المستفيد (Unified Member Lifecycle Status)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. إضافة العمود الجديد
ALTER TABLE members ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(30);

-- 2. هجرة البيانات بناءً على المنطق المدمج
-- الأولوية: عدم الأهلية > الحظر > الإيقاف > الانتهاء > قيد التحقق > نشط
UPDATE members 
SET lifecycle_status = 
    CASE 
        WHEN eligibility_status = FALSE THEN 'INELIGIBLE'
        WHEN card_status = 'BLOCKED' THEN 'BLOCKED'
        WHEN status = 'SUSPENDED' THEN 'SUSPENDED'
        WHEN card_status = 'EXPIRED' OR end_date < CURRENT_DATE THEN 'TERMINATED'
        WHEN status = 'PENDING_VERIFICATION' THEN 'PENDING_VERIFICATION'
        WHEN status = 'DRAFT' THEN 'DRAFT'
        WHEN status = 'PENDING' THEN 'PENDING_VERIFICATION'
        ELSE 'ACTIVE'
    END;

-- 3. ضبط القيمة الافتراضية والقيود
ALTER TABLE members ALTER COLUMN lifecycle_status SET DEFAULT 'ACTIVE';
ALTER TABLE members ALTER COLUMN lifecycle_status SET NOT NULL;

-- 4. جعل الأعمدة القديمة تسمح بالقيم الفارغة (للترقية التدريجية)
ALTER TABLE members ALTER COLUMN status DROP NOT NULL;
ALTER TABLE members ALTER COLUMN card_status DROP NOT NULL;
ALTER TABLE members ALTER COLUMN eligibility_status DROP NOT NULL;

-- 5. إضافة فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_members_lifecycle_status ON members(lifecycle_status);
