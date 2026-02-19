-- ═══════════════════════════════════════════════════════════════════════════
-- V18. تحسينات الأداء للمرحلة الأولى (Phase 1 Database Optimizations)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. فهارس موديول المستفيدين (Members Module)
-- الغرض: تسريع البحث عن المستفيدين حسب جهة العمل والحالة
CREATE INDEX IF NOT EXISTS idx_members_employer_status ON members(employer_org_id, status);
CREATE INDEX IF NOT EXISTS idx_members_civil_status ON members(civil_id, status);

-- 2. فهارس موديول المطالبات (Claims Module)
-- الغرض: تسريع عرض المطالبات حسب المستفيد أو مقدم الخدمة مع الحالة
CREATE INDEX IF NOT EXISTS idx_claims_member_status ON claims(member_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_provider_status ON claims(provider_id, status, created_at DESC);

-- 3. فهارس موديول الأمان (Security Module)
-- الغرض: تسريع عملية تسجيل الدخول والتحقق من المستخدم النشط
CREATE INDEX IF NOT EXISTS idx_users_username_active ON users(username, active);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_revoked ON refresh_tokens(token, revoked);

-- 4. فهارس موديول سجلات النظام (Logs)
-- الغرض: تسريع استعلامات تتبع الأخطاء وسير العمل
CREATE INDEX IF NOT EXISTS idx_lifecycle_entity_action ON lifecycle_logs(entity_type, entity_id, action);
CREATE INDEX IF NOT EXISTS idx_user_login_attempts_username_success ON user_login_attempts(username, success);
