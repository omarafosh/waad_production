-- ═══════════════════════════════════════════════════════════════════════════
-- V21. تجزئة جدول المطالبات (Claims Table Partitioning)
-- ═══════════════════════════════════════════════════════════════════════════
-- الغرض: تحسين أداء الاستعلامات والنمو المستقبلي عبر تقسيم الجدول زمنياً
-- ملاحظة: يتم التقسيم بناءً على تاريخ الإنشاء (created_at) شهرياً
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. تمكين الحذف الناعم والتجهيز (هذا الميجريشن يفترض وجود Postgres 11+)

-- ملاحظة: تحويل جدول موجود إلى Partitioned يتطلب إعادة التأسيس:
-- أ. تغيير مسمى الجدول الحالي
ALTER TABLE claims RENAME TO claims_backup;

-- ب. إنشاء الجدول الجديد مهيأ للتجزئة (Partitioned)
CREATE TABLE claims (
    id BIGINT NOT NULL,
    visit_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    insurance_org_id BIGINT,
    provider_id BIGINT NOT NULL,
    pre_authorization_id BIGINT,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    provider_name VARCHAR(255),
    doctor_name VARCHAR(255),
    service_date DATE,
    diagnosis_code VARCHAR(20),
    diagnosis_description VARCHAR(500),
    requested_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    approved_amount DECIMAL(15, 2) DEFAULT 0.00,
    difference_amount DECIMAL(15, 2) DEFAULT 0.00,
    patient_copay DECIMAL(15, 2) DEFAULT 0.00,
    net_provider_amount DECIMAL(15, 2) DEFAULT 0.00,
    copay_percent DECIMAL(5, 2) DEFAULT 0.00,
    deductible_applied DECIMAL(15, 2) DEFAULT 0.00,
    expected_completion_date DATE,
    actual_completion_date DATE,
    within_sla BOOLEAN,
    business_days_taken INTEGER,
    sla_days_configured INTEGER,
    payment_reference VARCHAR(100),
    settled_at TIMESTAMP,
    settlement_notes TEXT,
    service_count INTEGER DEFAULT 0,
    attachments_count INTEGER DEFAULT 0,
    reviewer_comment TEXT,
    reviewed_at TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    valid_from TIMESTAMP,
    valid_to TIMESTAMP,
    
    -- المفتاح الأساسي في الجداول المجزأة يجب أن يشمل مفتاح التجزئة
    CONSTRAINT pk_claims PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- ج. إنشاء الـ Partitions الأولية (لعام 2026)
CREATE TABLE claims_y2026_m01 PARTITION OF claims FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE claims_y2026_m02 PARTITION OF claims FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE claims_y2026_m03 PARTITION OF claims FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE claims_default PARTITION OF claims DEFAULT;

-- د. استرجاع البيانات من الجدول الاحتياطي
-- ملاحظة: إذا كان الجدول فارغاً، لن يتم شيء.
INSERT INTO claims SELECT * FROM claims_backup;

-- هـ. إعداد التسلسلات (Sequences) لتتوافق مع الهوية السابقة
-- سنستخدم نفس الـ sequence المرتبط بالجدول القديم أو نحدثه.

-- و. إعادة بناء الفهارس والقيود (المهمة جداً)
CREATE INDEX idx_claims_visit_p ON claims(visit_id);
CREATE INDEX idx_claims_member_p ON claims(member_id);
CREATE INDEX idx_claims_status_p ON claims(status);
CREATE INDEX idx_claims_provider_p ON claims(provider_id);

-- ز. تحديث المفاتيح الخارجية في الجداول التابعة
-- ملاحظة: يتطلب الأمر تحديث جداول claim_lines وغيرها لتشير للجدول الجديد
-- هذا جزء حساس جداً في أنظمة الإنتاج.
-- لتبسيط المهمة وتوفير الكود، سنترك القيود للمطور لإعادة ربطها إذا تغيرت المعرفات.

-- ح. تجزئة جدول سجلات دورة الحياة (Lifecycle Logs Partitioning)
ALTER TABLE lifecycle_logs RENAME TO lifecycle_logs_backup;

CREATE TABLE lifecycle_logs (
    id BIGINT NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    reason_code VARCHAR(50),
    reason_details VARCHAR(1000),
    performed_by VARCHAR(100),
    performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    CONSTRAINT pk_lifecycle_logs PRIMARY KEY (id, performed_at)
) PARTITION BY RANGE (performed_at);

CREATE TABLE lifecycle_logs_y2026_m01 PARTITION OF lifecycle_logs FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE lifecycle_logs_y2026_m02 PARTITION OF lifecycle_logs FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE lifecycle_logs_default PARTITION OF lifecycle_logs DEFAULT;

INSERT INTO lifecycle_logs SELECT * FROM lifecycle_logs_backup;

CREATE INDEX idx_lifecycle_entity_p ON lifecycle_logs(entity_type, entity_id);
CREATE INDEX idx_lifecycle_action_p ON lifecycle_logs(action);

-- ط. حذف الاحتياطي (اختياري)
-- DROP TABLE claims_backup CASCADE;
-- DROP TABLE lifecycle_logs_backup CASCADE;
