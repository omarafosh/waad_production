-- ═══════════════════════════════════════════════════════════════════════════
-- 01. الأمن والمصادقة وإدارة الصلاحيات (Security, Authentication & RBAC)
-- ═══════════════════════════════════════════════════════════════════════════
-- الغرض: إدارة المستخدمين، الأدوار، الصلاحيات، والمصادقة
-- الاستخدام: نظام RBAC (Role-Based Access Control) كامل
-- الجداول: 9 جداول رئيسية
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. جدول الأدوار (Roles)
-- ═══════════════════════════════════════════════════════════════════════════
-- الغرض: تعريف الأدوار الوظيفية في النظام (مدير، محاسب، مراجع، إلخ)
-- الاستخدام: يتم ربط كل مستخدم بدور أو أكثر، وكل دور له صلاحيات محددة
-- العلاقات: 
--   - يرتبط بـ users عبر user_roles (Many-to-Many)
--   - يرتبط بـ permissions عبر role_permissions (Many-to-Many)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS roles (
    -- ═══════════════════════════════════════════════════════════════════════
    -- المعرف الأساسي (Primary Key)
    -- ═══════════════════════════════════════════════════════════════════════
    id BIGSERIAL PRIMARY KEY,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- البيانات الأساسية (Core Data)
    -- ═══════════════════════════════════════════════════════════════════════
    name VARCHAR(50) NOT NULL UNIQUE,           -- الاسم بالإنجليزية (SUPER_ADMIN, INSURANCE_ADMIN, إلخ)
    name_ar VARCHAR(100),                       -- الاسم بالعربية (مدير النظام، مدير التأمين، إلخ)
    description VARCHAR(500),                   -- الوصف بالإنجليزية
    description_ar VARCHAR(500),                -- الوصف بالعربية
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- الحالة والصلاحية (Status & Validity)
    -- ═══════════════════════════════════════════════════════════════════════
    active BOOLEAN NOT NULL DEFAULT TRUE,       -- نشط/غير نشط (لتعطيل الدور مؤقتاً)
    valid_from TIMESTAMP,                       -- تاريخ بداية الصلاحية (اختياري)
    valid_to TIMESTAMP,                         -- تاريخ نهاية الصلاحية (اختياري)
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- التدقيق والإصدارات (Audit & Versioning)
    -- ═══════════════════════════════════════════════════════════════════════
    version BIGINT NOT NULL DEFAULT 0,          -- رقم الإصدار (للتحكم في التزامن - Optimistic Locking)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- تاريخ الإنشاء
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- تاريخ آخر تحديث
    created_by VARCHAR(100),                    -- اسم المستخدم الذي أنشأ السجل
    updated_by VARCHAR(100),                    -- اسم المستخدم الذي عدّل السجل
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- الحذف الناعم (Soft Delete)
    -- ═══════════════════════════════════════════════════════════════════════
    deleted BOOLEAN NOT NULL DEFAULT FALSE,     -- محذوف/غير محذوف (الحذف الناعم)
    deleted_at TIMESTAMP,                       -- تاريخ الحذف
    deleted_by VARCHAR(100)                     -- اسم المستخدم الذي حذف السجل
);

-- الفهارس (Indexes)
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(active);
-- الغرض: تسريع البحث عن الأدوار النشطة

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
-- الغرض: تسريع البحث بالاسم


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. جدول الصلاحيات (Permissions)
-- ═══════════════════════════════════════════════════════════════════════════
-- الغرض: تعريف الصلاحيات الدقيقة في النظام (إضافة، تعديل، حذف، عرض)
-- الاستخدام: يتم ربط الصلاحيات بالأدوار، وكل دور يحصل على مجموعة من الصلاحيات
-- العلاقات:
--   - يرتبط بـ roles عبر role_permissions (Many-to-Many)
-- أمثلة: CREATE_MEMBER, EDIT_CLAIM, DELETE_PROVIDER, VIEW_REPORTS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS permissions (
    -- ═══════════════════════════════════════════════════════════════════════
    -- المعرف الأساسي (Primary Key)
    -- ═══════════════════════════════════════════════════════════════════════
    id BIGSERIAL PRIMARY KEY,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- البيانات الأساسية (Core Data)
    -- ═══════════════════════════════════════════════════════════════════════
    name VARCHAR(100) NOT NULL UNIQUE,          -- الاسم الفريد (CREATE_MEMBER, EDIT_CLAIM, إلخ)
    name_ar VARCHAR(100),                       -- الاسم بالعربية (إضافة مستفيد، تعديل مطالبة، إلخ)
    description VARCHAR(500),                   -- الوصف بالإنجليزية
    description_ar VARCHAR(500),                -- الوصف بالعربية
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- التصنيف (Categorization)
    -- ═══════════════════════════════════════════════════════════════════════
    module VARCHAR(50),                         -- الوحدة (MEMBERS, CLAIMS, PROVIDERS, إلخ)
    module_name VARCHAR(100),                   -- اسم الوحدة (المستفيدين، المطالبات، مقدمي الخدمة، إلخ)
    category VARCHAR(50) DEFAULT 'GENERAL',     -- التصنيف (GENERAL, ADMIN, FINANCIAL, إلخ)
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- الحالة والصلاحية (Status & Validity)
    -- ═══════════════════════════════════════════════════════════════════════
    active BOOLEAN NOT NULL DEFAULT TRUE,       -- نشط/غير نشط
    valid_from TIMESTAMP,                       -- تاريخ بداية الصلاحية
    valid_to TIMESTAMP,                         -- تاريخ نهاية الصلاحية
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- التدقيق والإصدارات (Audit & Versioning)
    -- ═══════════════════════════════════════════════════════════════════════
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- الحذف الناعم (Soft Delete)
    -- ═══════════════════════════════════════════════════════════════════════
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100)
);

-- الفهارس (Indexes)
CREATE INDEX IF NOT EXISTS idx_permissions_active ON permissions(active);
-- الغرض: تسريع البحث عن الصلاحيات النشطة

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
-- الغرض: تسريع البحث بالوحدة

CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
-- الغرض: تسريع البحث بالتصنيف


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. جدول المستخدمين (Users)
-- ═══════════════════════════════════════════════════════════════════════════
-- الغرض: تخزين بيانات المستخدمين الذين يمكنهم الوصول إلى النظام
-- الاستخدام: المصادقة، التحكم في الوصول، التدقيق
-- العلاقات:
--   - يرتبط بـ roles عبر user_roles (Many-to-Many)
--   - يرتبط بـ companies (اختياري)
--   - يرتبط بـ organizations (اختياري - employer_id)
--   - يرتبط بـ providers (اختياري)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    -- ═══════════════════════════════════════════════════════════════════════
    -- المعرف الأساسي (Primary Key)
    -- ═══════════════════════════════════════════════════════════════════════
    id BIGSERIAL PRIMARY KEY,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- بيانات المصادقة (Authentication Data)
    -- ═══════════════════════════════════════════════════════════════════════
    username VARCHAR(255) NOT NULL UNIQUE,      -- اسم المستخدم (فريد)
    email VARCHAR(100) NOT NULL UNIQUE,         -- البريد الإلكتروني (فريد)
    password VARCHAR(255) NOT NULL,             -- كلمة المرور (مشفرة بـ BCrypt)
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- البيانات الشخصية (Personal Data)
    -- ═══════════════════════════════════════════════════════════════════════
    full_name VARCHAR(200) NOT NULL,            -- الاسم الكامل
    civil_id VARCHAR(50) UNIQUE,                -- الرقم المدني (فريد، اختياري)
    phone VARCHAR(50),                          -- رقم الهاتف
    profile_image_url VARCHAR(255),             -- رابط صورة الملف الشخصي
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- أمان الحساب (Account Security)
    -- ═══════════════════════════════════════════════════════════════════════
    email_verified BOOLEAN DEFAULT FALSE,       -- هل تم التحقق من البريد الإلكتروني؟
    password_changed_at TIMESTAMP,              -- تاريخ آخر تغيير لكلمة المرور
    failed_login_count INTEGER DEFAULT 0 NOT NULL,  -- عدد محاولات تسجيل الدخول الفاشلة
    locked_until TIMESTAMP,                     -- الحساب مقفل حتى هذا التاريخ (بعد محاولات فاشلة متعددة)
    last_login_at TIMESTAMP,                    -- تاريخ آخر تسجيل دخول ناجح
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- سياق المؤسسة (Organization Context)
    -- ═══════════════════════════════════════════════════════════════════════
    -- ملاحظة: هذه الحقول تحدد السياق الافتراضي للمستخدم
    company_id BIGINT,                          -- الشركة التي ينتمي إليها المستخدم (اختياري)
    employer_id BIGINT,                         -- جهة العمل التي ينتمي إليها المستخدم (اختياري)
    provider_id BIGINT,                         -- مقدم الخدمة الذي ينتمي إليه المستخدم (اختياري)
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- أعلام الوصول (Access Flags)
    -- ═══════════════════════════════════════════════════════════════════════
    -- ملاحظة: هذه أعلام سريعة للتحكم في الوصول، لكن الصلاحيات الدقيقة تُدار عبر RBAC
    allow_all_companies BOOLEAN DEFAULT FALSE,  -- السماح بالوصول لكل الشركات؟
    can_view_members BOOLEAN DEFAULT TRUE,      -- السماح بعرض المستفيدين؟
    can_view_benefit_policies BOOLEAN DEFAULT TRUE,  -- السماح بعرض سياسات المنافع؟
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- الحالة والصلاحية (Status & Validity)
    -- ═══════════════════════════════════════════════════════════════════════
    active BOOLEAN NOT NULL DEFAULT TRUE,       -- نشط/غير نشط
    valid_from TIMESTAMP,                       -- تاريخ بداية الصلاحية
    valid_to TIMESTAMP,                         -- تاريخ نهاية الصلاحية
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- التدقيق والإصدارات (Audit & Versioning)
    -- ═══════════════════════════════════════════════════════════════════════
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- الحذف الناعم (Soft Delete)
    -- ═══════════════════════════════════════════════════════════════════════
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100)
);

-- الفهارس (Indexes)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- الغرض: تسريع البحث بالبريد الإلكتروني (للمصادقة)

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
-- الغرض: تسريع البحث باسم المستخدم (للمصادقة)

CREATE INDEX IF NOT EXISTS idx_users_civil_id ON users(civil_id);
-- الغرض: تسريع البحث بالرقم المدني

CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
-- الغرض: تسريع البحث عن المستخدمين النشطين

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
-- الغرض: تسريع البحث بالشركة

CREATE INDEX IF NOT EXISTS idx_users_employer ON users(employer_id);
-- الغرض: تسريع البحث بجهة العمل

CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider_id);
-- الغرض: تسريع البحث بمقدم الخدمة


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. جدول ربط المستخدمين بالأدوار (User Roles - Junction Table)
-- ═══════════════════════════════════════════════════════════════════════════
-- الغرض: ربط المستخدمين بالأدوار (علاقة Many-to-Many)
-- الاستخدام: كل مستخدم يمكن أن يكون له دور أو أكثر
-- العلاقات:
--   - user_id → users(id)
--   - role_id → roles(id)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,                    -- معرف المستخدم
    role_id BIGINT NOT NULL,                    -- معرف الدور
    
    PRIMARY KEY (user_id, role_id),             -- المفتاح الأساسي المركب (لمنع التكرار)
    
    -- القيود (Constraints)
    CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    -- الغرض: عند حذف المستخدم، تُحذف كل أدواره تلقائياً
    
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    -- الغرض: عند حذف الدور، تُحذف كل ارتباطاته بالمستخدمين تلقائياً
);

-- الفهارس (Indexes)
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
-- الغرض: تسريع البحث عن أدوار مستخدم معين

CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
-- الغرض: تسريع البحث عن المستخدمين الذين لديهم دور معين


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. جدول ربط الأدوار بالصلاحيات (Role Permissions - Junction Table)
-- ═══════════════════════════════════════════════════════════════════════════
-- الغرض: ربط الأدوار بالصلاحيات (علاقة Many-to-Many)
-- الاستخدام: كل دور يمكن أن يكون له صلاحية أو أكثر
-- العلاقات:
--   - role_id → roles(id)
--   - permission_id → permissions(id)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT NOT NULL,                    -- معرف الدور
    permission_id BIGINT NOT NULL,              -- معرف الصلاحية
    
    PRIMARY KEY (role_id, permission_id),       -- المفتاح الأساسي المركب (لمنع التكرار)
    
    -- القيود (Constraints)
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    -- الغرض: عند حذف الدور، تُحذف كل صلاحياته تلقائياً
    
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    -- الغرض: عند حذف الصلاحية، تُحذف كل ارتباطاتها بالأدوار تلقائياً
);

-- الفهارس (Indexes)
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
-- الغرض: تسريع البحث عن صلاحيات دور معين

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
-- الغرض: تسريع البحث عن الأدوار التي لديها صلاحية معينة


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. جدول رموز التحقق من البريد الإلكتروني (Email Verification Tokens)
-- ═══════════════════════════════════════════════════════════════════════════
-- الغرض: تخزين رموز التحقق المرسلة للمستخدمين عبر البريد الإلكتروني
-- الاستخدام: عند تسجيل مستخدم جديد، يُرسل له رمز تحقق لتأكيد البريد الإلكتروني
-- العلاقات:
--   - user_id → users(id)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,                    -- معرف المستخدم
    token VARCHAR(255) UNIQUE NOT NULL,         -- الرمز الفريد (UUID أو JWT)
    expires_at TIMESTAMP NOT NULL,              -- تاريخ انتهاء صلاحية الرمز
    verified BOOLEAN NOT NULL DEFAULT FALSE,    -- هل تم التحقق؟
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- تاريخ الإنشاء
    
    CONSTRAINT fk_evt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    -- الغرض: عند حذف المستخدم، تُحذف كل رموز التحقق الخاصة به
);

-- الفهارس (Indexes)
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens(user_id);
-- الغرض: تسريع البحث عن رموز التحقق لمستخدم معين

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
-- الغرض: تسريع البحث بالرمز


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. جدول رموز إعادة تعيين كلمة المرور (Password Reset Tokens)
-- ═══════════════════════════════════════════════════════════════════════════
-- الغرض: تخزين رموز إعادة تعيين كلمة المرور المرسلة للمستخدمين
-- الاستخدام: عند نسيان كلمة المرور، يُرسل للمستخدم رمز لإعادة تعيينها
-- العلاقات:
--   - user_id → users(id)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,                    -- معرف المستخدم
    token VARCHAR(255) UNIQUE NOT NULL,         -- الرمز الفريد (UUID أو JWT)
    email VARCHAR(255),                         -- البريد الإلكتروني (للتحقق)
    expires_at TIMESTAMP NOT NULL,              -- تاريخ انتهاء صلاحية الرمز
    used BOOLEAN NOT NULL DEFAULT FALSE,        -- هل تم استخدام الرمز؟
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- تاريخ الإنشاء
    
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    -- الغرض: عند حذف المستخدم، تُحذف كل رموز إعادة التعيين الخاصة به
);

-- الفهارس (Indexes)
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
-- الغرض: تسريع البحث عن رموز إعادة التعيين لمستخدم معين

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
-- الغرض: تسريع البحث بالرمز


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. جدول رموز التحديث (Refresh Tokens)
-- ═══════════════════════════════════════════════════════════════════════════
-- الغرض: تخزين رموز التحديث (Refresh Tokens) للمصادقة المستمرة
-- الاستخدام: عند انتهاء صلاحية Access Token، يُستخدم Refresh Token للحصول على واحد جديد
-- العلاقات:
--   - users_id → users(id)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    users_id BIGINT NOT NULL,                   -- معرف المستخدم
    token VARCHAR(255) NOT NULL UNIQUE,         -- الرمز الفريد
    expiry_date TIMESTAMP NOT NULL,             -- تاريخ انتهاء الصلاحية
    revoked BOOLEAN DEFAULT FALSE NOT NULL,     -- هل تم إلغاء الرمز؟
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,  -- تاريخ الإنشاء
    
    CONSTRAINT fk_refresh_token_user FOREIGN KEY (users_id) REFERENCES users(id) ON DELETE CASCADE
    -- الغرض: عند حذف المستخدم، تُحذف كل رموز التحديث الخاصة به
);

-- الفهارس (Indexes)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(users_id);
-- الغرض: تسريع البحث عن رموز التحديث لمستخدم معين

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
-- الغرض: تسريع البحث بالرمز

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expiry ON refresh_tokens(expiry_date);
-- الغرض: تسريع البحث عن الرموز المنتهية (للتنظيف الدوري)


-- ═══════════════════════════════════════════════════════════════════════════
-- 9. جدول محاولات تسجيل الدخول (User Login Attempts)
-- ═══════════════════════════════════════════════════════════════════════════
-- الغرض: تسجيل كل محاولات تسجيل الدخول (الناجحة والفاشلة)
-- الاستخدام: الأمان، التدقيق، كشف الهجمات
-- العلاقات:
--   - user_id → users(id) (اختياري - قد لا يكون المستخدم موجوداً)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_login_attempts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,                             -- معرف المستخدم (NULL إذا كان اسم المستخدم غير موجود)
    username VARCHAR(100),                      -- اسم المستخدم المُدخل
    ip_address VARCHAR(45),                     -- عنوان IP (IPv4 أو IPv6)
    user_agent VARCHAR(500),                    -- معلومات المتصفح
    success BOOLEAN NOT NULL,                   -- نجحت المحاولة؟
    failed_reason VARCHAR(255),                 -- سبب الفشل (كلمة مرور خاطئة، حساب مقفل، إلخ)
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- تاريخ المحاولة
);

-- الفهارس (Indexes)
CREATE INDEX IF NOT EXISTS idx_user_login_attempts_user ON user_login_attempts(user_id);
-- الغرض: تسريع البحث عن محاولات تسجيل دخول مستخدم معين

CREATE INDEX IF NOT EXISTS idx_user_login_attempts_ip ON user_login_attempts(ip_address);
-- الغرض: تسريع البحث بعنوان IP (لكشف الهجمات)

CREATE INDEX IF NOT EXISTS idx_user_login_attempts_attempted_at ON user_login_attempts(attempted_at DESC);
-- الغرض: تسريع البحث بالتاريخ (للتقارير)


-- ═══════════════════════════════════════════════════════════════════════════
-- 10. جدول سجل تدقيق المستخدمين (User Audit Log)
-- ═══════════════════════════════════════════════════════════════════════════
-- الغرض: تسجيل كل التغييرات التي تحدث على بيانات المستخدمين
-- الاستخدام: التدقيق، التتبع، الامتثال
-- العلاقات:
--   - user_id → users(id)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,                    -- معرف المستخدم المُعدَّل
    action VARCHAR(100) NOT NULL,               -- نوع الإجراء (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, إلخ)
    details TEXT,                               -- تفاصيل الإجراء
    performed_by BIGINT,                        -- معرف المستخدم الذي قام بالإجراء
    performed_by_username VARCHAR(100),         -- اسم المستخدم الذي قام بالإجراء
    old_value JSONB,                            -- القيمة القديمة (قبل التعديل)
    new_value JSONB,                            -- القيمة الجديدة (بعد التعديل)
    ip_address VARCHAR(45),                     -- عنوان IP
    user_agent TEXT,                            -- معلومات المتصفح
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- تاريخ الإجراء
    
    CONSTRAINT fk_user_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    -- الغرض: عند حذف المستخدم، تُحذف كل سجلات التدقيق الخاصة به
);

-- الفهارس (Indexes)
CREATE INDEX IF NOT EXISTS idx_user_audit_log_user_id ON user_audit_log(user_id);
-- الغرض: تسريع البحث عن سجلات تدقيق مستخدم معين

CREATE INDEX IF NOT EXISTS idx_user_audit_log_created_at ON user_audit_log(created_at DESC);
-- الغرض: تسريع البحث بالتاريخ (للتقارير)

CREATE INDEX IF NOT EXISTS idx_user_audit_log_action ON user_audit_log(action);
-- الغرض: تسريع البحث بنوع الإجراء

CREATE INDEX IF NOT EXISTS idx_user_audit_log_performed_by ON user_audit_log(performed_by);
-- الغرض: تسريع البحث عن الإجراءات التي قام بها مستخدم معين


-- ═══════════════════════════════════════════════════════════════════════════
-- البيانات الأولية (Initial Data)
-- ═══════════════════════════════════════════════════════════════════════════

-- إدراج الأدوار الأساسية (Default Roles)
INSERT INTO roles (name, name_ar, description, description_ar) VALUES
('SUPER_ADMIN', 'مدير النظام', 'Full system access with all permissions', 'وصول كامل للنظام مع جميع الصلاحيات'),
('INSURANCE_ADMIN', 'مدير التأمين', 'Insurance and contract management', 'إدارة التأمينات والعقود'),
('PROVIDER', 'مقدم الخدمة', 'Provider portal access for pre-approvals and claims', 'بوابة مقدمي الخدمة للموافقات المسبقة والمطالبات'),
('REVIEWER', 'المراجع الطبي', 'Medical claims review and approval', 'مراجعة واعتماد المطالبات الطبية'),
('ACCOUNTANT', 'المحاسب', 'Financial management and settlements', 'الإدارة المالية والتسويات'),
('BENEFICIARY', 'المستفيد', 'Basic member access to view coverage and claims', 'وصول الأعضاء لعرض التغطية والمطالبات')
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- ملاحظات مهمة (Important Notes)
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. كلمات المرور يجب أن تُشفر باستخدام BCrypt قبل التخزين
-- 2. رموز JWT يجب أن تكون قصيرة العمر (15-30 دقيقة)
-- 3. رموز Refresh يجب أن تكون طويلة العمر (7-30 يوم)
-- 4. يجب تنظيف الرموز المنتهية دورياً (Scheduled Job)
-- 5. يجب قفل الحساب بعد 5 محاولات فاشلة متتالية
-- 6. يجب إرسال تنبيه للمستخدم عند تسجيل دخول من جهاز جديد
-- ═══════════════════════════════════════════════════════════════════════════
