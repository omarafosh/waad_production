-- ═══════════════════════════════════════════════════════════════════════════
-- 01. الأساس الأمني والصلاحيات (Auth & RBAC Module - Clean Baseline)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. الأدوار (Roles)
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    name_ar VARCHAR(100),
    description VARCHAR(500),
    description_ar VARCHAR(500),
    
    -- Audit & Versioning (Matches SoftDeleteEntity.java)
    active BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Soft Delete Extensions (Optional but standard in Waad Refactoring)
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    valid_from TIMESTAMP,
    valid_to TIMESTAMP
);

-- 2. الصلاحيات (Permissions)
CREATE TABLE IF NOT EXISTS permissions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    name_ar VARCHAR(100),
    description VARCHAR(500),
    description_ar VARCHAR(500),
    module VARCHAR(50),
    module_name VARCHAR(100), -- Missing column identified in Entity
    category VARCHAR(50) DEFAULT 'GENERAL',
    
    -- Audit & Versioning
    active BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Soft Delete Extensions
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    valid_from TIMESTAMP,
    valid_to TIMESTAMP
);

-- 3. المستخدمين (Users)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    civil_id VARCHAR(50) UNIQUE,
    phone VARCHAR(50),
    profile_image_url VARCHAR(255),
    
    email_verified BOOLEAN DEFAULT FALSE,
    password_changed_at TIMESTAMP,
    failed_login_count INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    
    -- سياق المؤسسة (Organization Context)
    company_id BIGINT,
    employer_id BIGINT,
    provider_id BIGINT,
    
    -- أعلام الوصول (Access Flags)
    allow_all_companies BOOLEAN DEFAULT FALSE,
    can_view_members BOOLEAN DEFAULT TRUE,
    can_view_benefit_policies BOOLEAN DEFAULT TRUE,
    
    -- Audit & Versioning
    active BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    -- Soft Delete Extensions
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    valid_from TIMESTAMP,
    valid_to TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_civil_id ON users(civil_id);

-- 4. علاقة المستخدمين بالأدوار (User Roles)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- 5. علاقة الأدوار بالصلاحيات (Role Permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- 6. رموز الأمان (Security Tokens)
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_evt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. رموز التحديث (Refresh Tokens)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    users_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiry_date TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_refresh_token_user FOREIGN KEY (users_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. التدقيق والسجلات (Audit & Logs)
CREATE TABLE IF NOT EXISTS user_login_attempts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    username VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    success BOOLEAN NOT NULL,
    failed_reason VARCHAR(255),
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT, -- Missing column identified in Entity
    performed_by BIGINT,
    performed_by_username VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_audit_log_user_id ON user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_created_at ON user_audit_log(created_at DESC);

-- 9. تهيئة الأدوار الأساسية (Default Roles)
INSERT INTO roles (name, name_ar, description, description_ar) VALUES
('SUPER_ADMIN', 'مدير النظام - صلاحيات كاملة', 'Full system access', 'وصول كامل للنظام'),
('INSURANCE_ADMIN', 'مدير التأمين - إدارة التغطية والعقود', 'Insurance and contract management', 'إدارة التأمينات والعقود'),
('PROVIDER', 'مقدم الخدمة - إدارة الموافقات والمطالبات', 'Provider portal access', 'بوابة مقدمي الخدمة'),
('REVIEWER', 'المراجع - مراجعة واعتماد المطالبات', 'Claims review and approval', 'مراجعة واعتماد المطالبات'),
('ACCOUNTANT', 'المحاسب - الإدارة المالية والتسويات', 'Financial management', 'الإدارة المالية'),
('BENEFICIARY', 'المستفيد', 'Basic member access', 'وصول الأعضاء')
ON CONFLICT (name) DO NOTHING;
