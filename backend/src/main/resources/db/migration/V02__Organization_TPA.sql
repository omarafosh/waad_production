-- ═══════════════════════════════════════════════════════════════════════════
-- V02: ORGANIZATION & TPA SYSTEM (المؤسسات ونظام TPA)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. TPA SETTINGS (إعدادات TPA)
CREATE TABLE IF NOT EXISTS tpa_settings (
    id BIGINT PRIMARY KEY DEFAULT 1,
    company_name VARCHAR(255) NOT NULL,
    company_name_ar VARCHAR(255),
    company_code VARCHAR(50) UNIQUE NOT NULL,
    business_activity VARCHAR(255),
    commercial_registration VARCHAR(100),
    tax_number VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    website VARCHAR(200),
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#1976d2',
    secondary_color VARCHAR(7) DEFAULT '#424242',
    currency VARCHAR(10) DEFAULT 'KWD',
    default_language VARCHAR(10) DEFAULT 'ar',
    timezone VARCHAR(50) DEFAULT 'Asia/Kuwait',
    date_format VARCHAR(20) DEFAULT 'dd/MM/yyyy',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT single_tpa_settings CHECK (id = 1)
);

-- 2. EMPLOYERS (جهات العمل)
CREATE TABLE IF NOT EXISTS employers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    commercial_registration VARCHAR(100),
    tax_number VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    contract_start_date DATE,
    contract_end_date DATE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_employers_active ON employers(active) WHERE deleted = FALSE;

-- 3. NOTIFICATIONS (الإشعارات)
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'INFO',
    read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    entity_type VARCHAR(50),
    entity_id BIGINT,
    action_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
