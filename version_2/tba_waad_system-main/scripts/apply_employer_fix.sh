#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Apply SUPER_ADMIN Employer Permissions Fix
# TBA WAAD System - Fix 403 Employer Permission Issues
# ═══════════════════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Applying SUPER_ADMIN Employer Permissions Fix            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Database connection details (adjust if needed)
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="tba_waad_system"
DB_USER="postgres"

echo "📝 Applying database fix..."
echo ""

# Apply the SQL fix directly
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOFFIX'

-- Ensure permissions exist
INSERT INTO permissions (name, description, created_at, updated_at)
SELECT 
    'VIEW_EMPLOYERS',
    'View employer information | عرض أصحاب العمل',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE name = 'VIEW_EMPLOYERS'
);

INSERT INTO permissions (name, description, created_at, updated_at)
SELECT 
    'MANAGE_EMPLOYERS',
    'Full management of employer companies | إدارة أصحاب العمل',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE name = 'MANAGE_EMPLOYERS'
);

-- Assign to SUPER_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'SUPER_ADMIN'
  AND p.name IN ('VIEW_EMPLOYERS', 'MANAGE_EMPLOYERS')
  AND NOT EXISTS (
      SELECT 1 
      FROM role_permissions rp 
      WHERE rp.role_id = r.id 
        AND rp.permission_id = p.id
  );

-- Grant ALL permissions to SUPER_ADMIN (comprehensive fix)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'SUPER_ADMIN'
  AND NOT EXISTS (
      SELECT 1 
      FROM role_permissions rp 
      WHERE rp.role_id = r.id 
        AND rp.permission_id = p.id
  );

-- Verify
SELECT 
    'SUPER_ADMIN now has ' || COUNT(*) || ' permissions' as result
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
WHERE r.name = 'SUPER_ADMIN';

EOFFIX

echo ""
echo "✅ Fix applied successfully!"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  IMPORTANT: Next Steps                                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "1. Restart the backend application to reload permissions"
echo "2. Re-login to refresh your session with new permissions"
echo "3. Try creating an Employer again via the API"
echo ""
echo "If the issue persists:"
echo "- Check backend logs for authentication details"
echo "- Verify you're logged in as 'superadmin' user"
echo "- Run: ./diagnose_super_admin_permissions.sh"
echo ""
