-- ═══════════════════════════════════════════════════════════════════════════
-- V11: MASTER SYSTEM SEEDS (البيانات التأسيسية للنظام)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. BASE ROLES
INSERT INTO roles (name, name_ar, description, description_ar) VALUES
('SUPER_ADMIN', 'مدير النظام', 'Full system access', 'صلاحيات كاملة'),
('INSURANCE_ADMIN', 'مدير التأمين', 'Insurance management', 'إدارة التأمينات'),
('PROVIDER', 'مقدم الخدمة', 'Provider access', 'وصول المزودين'),
('REVIEWER', 'المراجع', 'Claims review', 'مراجعة المطالبات'),
('ACCOUNTANT', 'المحاسب', 'Financial management', 'الإدارة المالية'),
('BENEFICIARY', 'المستفيد', 'Basic member access', 'وصول الأعضاء')
ON CONFLICT (name) DO NOTHING;

-- 2. BASE PERMISSIONS
INSERT INTO permissions (name, name_ar, module, category) VALUES
('USER_VIEW', 'عرض المستخدمين', 'USER_MANAGEMENT', 'READ'),
('USER_CREATE', 'إنشاء مستخدم', 'USER_MANAGEMENT', 'WRITE'),
('MEMBER_VIEW', 'عرض المستفيدين', 'MEMBER_MANAGEMENT', 'READ'),
('PROVIDER_VIEW', 'عرض مقدمي الخدمة', 'PROVIDER_MANAGEMENT', 'READ'),
('CLAIM_VIEW', 'عرض المطالبات', 'CLAIM_MANAGEMENT', 'READ'),
('POLICY_VIEW', 'عرض السياسات', 'POLICY_MANAGEMENT', 'READ'),
('SETTLEMENT_VIEW', 'عرض التسويات', 'SETTLEMENT_MANAGEMENT', 'READ'),
('REPORT_VIEW', 'عرض التقارير', 'REPORTING', 'READ')
ON CONFLICT (name) DO NOTHING;

-- 3. ASSIGN PERMISSIONS TO SUPER_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'SUPER_ADMIN'), id FROM permissions
ON CONFLICT DO NOTHING;

-- 4. TPA DEFAULT SETTINGS
INSERT INTO tpa_settings (id, company_name, company_name_ar, company_code, email, phone, address, currency, default_language, active, created_by)
VALUES (1, 'WAAD TPA', 'وعد لإدارة المنافع الطبية', 'WAAD', 'info@waadtpa.com', '+965 XXXX XXXX', 'Kuwait City, Kuwait', 'KWD', 'ar', TRUE, 'SYSTEM')
ON CONFLICT (id) DO NOTHING;
