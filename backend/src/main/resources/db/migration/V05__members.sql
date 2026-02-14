-- ═══════════════════════════════════════════════════════════════════════════
-- 05. المستفيدين الموحد (Unified Member Module - Clean Baseline)
-- ═══════════════════════════════════════════════════════════════════════════
-- يشمل: الجداول، التسلسلات، الفهارس، وقيود التكامل لموديول المستفيدين.
-- المصادر المدمجة: V05, V35 (جزئياً), V90xx
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. التسلسلات (Sequences) لإنشاء أرقام البطاقات والباركود
CREATE SEQUENCE IF NOT EXISTS member_barcode_seq START WITH 1000 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_smart_card_random_id START WITH 100000 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS member_card_number_seq START WITH 1000 INCREMENT BY 1;

-- 2. سجلات دورة الحياة (Lifecycle Logs)
-- يستخدم لتتبع التغييرات في حالة الكيانات (مثل الأعضاء، المطالبات، إلخ)
CREATE TABLE IF NOT EXISTS lifecycle_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(255) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(255) NOT NULL,
    previous_status VARCHAR(255),
    new_status VARCHAR(255),
    reason_code VARCHAR(255),
    reason_details VARCHAR(1000),
    performed_by VARCHAR(255),
    performed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_entity ON lifecycle_logs(entity_type, entity_id);

-- 3. الجدول الرئيسي للمستفيدين (Members)
CREATE TABLE IF NOT EXISTS members (
    id BIGSERIAL PRIMARY KEY,
    
    -- الهيكل الهرمي (أصيل / تابع)
    parent_id BIGINT,
    relationship VARCHAR(20),
    
    -- المنظمة والتغطية
    employer_org_id BIGINT NOT NULL,
    insurance_org_id BIGINT,
    benefit_policy_id BIGINT,
    
    -- حقول البطاقة الذكية والتعريف المؤسسي
    relationship_code VARCHAR(5),
    provider_code VARCHAR(3),
    company_code VARCHAR(20),
    internal_id_part VARCHAR(20),
    card_activated_at TIMESTAMP,
    is_smart_card BOOLEAN DEFAULT FALSE,
    secondary_status VARCHAR(50),
    
    -- أعلام التميز والحالات الخاصة
    is_vip BOOLEAN DEFAULT FALSE,
    is_urgent BOOLEAN DEFAULT FALSE,
    emergency_notes VARCHAR(1000),
    
    -- البيانات الأساسية
    full_name VARCHAR(200) NOT NULL,
    civil_id VARCHAR(50), -- توحيد المسمى القياسي
    card_number VARCHAR(50),
    barcode VARCHAR(100),
    
    birth_date DATE,
    gender VARCHAR(10) DEFAULT 'UNDEFINED',
    marital_status VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    address VARCHAR(500),
    nationality VARCHAR(100),
    
    -- لقطات بيانات التأمين والتوظيف
    policy_number VARCHAR(100),
    employee_number VARCHAR(100),
    join_date DATE,
    occupation VARCHAR(100),
    
    -- الحالة والصلاحية
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    start_date DATE,
    end_date DATE,
    card_status VARCHAR(20) DEFAULT 'ACTIVE',
    blocked_reason VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- الأهلية (Eligibility)
    eligibility_status BOOLEAN DEFAULT TRUE,
    eligibility_updated_at TIMESTAMP,
    
    -- البيانات الوصفية والصور
    photo_url VARCHAR(1000), -- تم دمج profile_photo_path هنا
    notes VARCHAR(2000),
    
    -- أعمدة عامة (Global Columns)
    version BIGINT DEFAULT 0,
    valid_from TIMESTAMP,
    valid_to TIMESTAMP,
    
    -- التدقيق (Audit)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    CONSTRAINT fk_members_parent FOREIGN KEY (parent_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT fk_members_employer FOREIGN KEY (employer_org_id) REFERENCES organizations(id),
    CONSTRAINT fk_members_insurance FOREIGN KEY (insurance_org_id) REFERENCES organizations(id),
    CONSTRAINT fk_members_policy FOREIGN KEY (benefit_policy_id) REFERENCES benefit_policies(id),
    CONSTRAINT uk_member_card_number UNIQUE (card_number),
    CONSTRAINT uk_member_barcode UNIQUE (barcode),
    CONSTRAINT uk_member_civil_id UNIQUE (civil_id) -- إضافة قيد التفرد للهوية
);

CREATE INDEX IF NOT EXISTS idx_members_parent ON members(parent_id);
CREATE INDEX IF NOT EXISTS idx_members_employer ON members(employer_org_id);
CREATE INDEX IF NOT EXISTS idx_members_barcode ON members(barcode);
CREATE INDEX IF NOT EXISTS idx_members_active ON members(active);
CREATE INDEX IF NOT EXISTS idx_members_civil_id ON members(civil_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_full_name_lower ON members(LOWER(full_name));

-- 4. وثائق المستفيد (Member Documents)
CREATE TABLE IF NOT EXISTS member_documents (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_name VARCHAR(255),
    mime_type VARCHAR(255),
    file_size BIGINT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    verified_by VARCHAR(255),
    notes TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    uploaded_by VARCHAR(255),
    CONSTRAINT fk_md_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- 5. سمات المستفيد (Member Attributes)
CREATE TABLE IF NOT EXISTS member_attributes (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    attribute_code VARCHAR(100) NOT NULL,
    attribute_value TEXT,
    source VARCHAR(50) DEFAULT 'MANUAL',
    source_reference VARCHAR(200),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT NOW(), 
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_ma_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- 6. الأمراض المزمنة للمستفيد (Member Chronic Conditions)
CREATE TABLE IF NOT EXISTS member_chronic_conditions (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    condition_type VARCHAR(50) NOT NULL,
    custom_condition_name VARCHAR(200),
    icd10_code VARCHAR(20),
    diagnosis_date DATE,
    disclosure_date DATE,
    severity_level INTEGER DEFAULT 3,
    coverage_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
    waiting_period_days INTEGER DEFAULT 0,
    waiting_period_end_date DATE,
    coverage_percentage DECIMAL(5, 2),
    annual_limit DECIMAL(15, 2),
    used_amount DECIMAL(15, 2) DEFAULT 0.00,
    coverage_reason VARCHAR(500),
    documentation_path VARCHAR(500),
    diagnosing_physician VARCHAR(200),
    diagnosing_facility VARCHAR(200),
    documentation_verified BOOLEAN DEFAULT FALSE,
    verification_date DATE,
    verified_by VARCHAR(100),
    current_medications VARCHAR(1000),
    treatment_plan VARCHAR(2000),
    last_review_date DATE,
    next_review_date DATE,
    resolved_date DATE,
    notes VARCHAR(2000),
    internal_notes VARCHAR(2000),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT uk_member_condition UNIQUE (member_id, condition_type),
    CONSTRAINT fk_mcc_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE INDEX idx_mcc_member_id ON member_chronic_conditions(member_id);

-- 7. سجلات استيراد الأعضاء (Member Import Logs)
CREATE TABLE IF NOT EXISTS member_import_logs (
    id BIGSERIAL PRIMARY KEY,
    import_batch_id VARCHAR(64) UNIQUE NOT NULL,
    file_name VARCHAR(500),
    file_size_bytes BIGINT,
    total_rows INTEGER DEFAULT 0,
    created_count INTEGER DEFAULT 0,
    updated_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    processing_time_ms BIGINT,
    imported_by_user_id BIGINT,
    imported_by_username VARCHAR(100),
    company_scope_id BIGINT,
    ip_address VARCHAR(45),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_import_errors (
    id BIGSERIAL PRIMARY KEY,
    import_log_id BIGINT NOT NULL,
    row_number INTEGER NOT NULL,
    row_data JSONB,
    error_type VARCHAR(50),
    error_field VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mie_import_log FOREIGN KEY (import_log_id) REFERENCES member_import_logs(id) ON DELETE CASCADE
);

-- 8. تاريخ سير العمل (Workflow History)
CREATE TABLE IF NOT EXISTS member_workflow_history (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    from_status VARCHAR(255),
    to_status VARCHAR(255),
    changed_at TIMESTAMP NOT NULL,
    changed_by VARCHAR(255),
    reason VARCHAR(255),
    CONSTRAINT fk_mwh_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);
