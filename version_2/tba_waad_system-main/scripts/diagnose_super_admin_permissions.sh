#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# SUPER_ADMIN Permissions Diagnostic Script
# TBA WAAD System - Diagnose 403 Employer Permission Issues
# ═══════════════════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  SUPER_ADMIN Permissions Diagnostic Tool                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Database connection details (adjust if needed)
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="tba_waad"
DB_USER="postgres"

echo "📋 Checking SUPER_ADMIN permissions..."
echo ""

# Query 1: Check if SUPER_ADMIN role exists
echo "1️⃣ Checking SUPER_ADMIN role..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM roles WHERE name = 'SUPER_ADMIN') 
        THEN '✅ SUPER_ADMIN role found'
        ELSE '❌ SUPER_ADMIN role NOT found'
    END;
"

# Query 2: Check if Employer permissions exist
echo ""
echo "2️⃣ Checking Employer permissions..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    name,
    description,
    CASE WHEN id IS NOT NULL THEN '✅' ELSE '❌' END as status
FROM permissions
WHERE name IN ('VIEW_EMPLOYERS', 'MANAGE_EMPLOYERS')
ORDER BY name;
"

# Query 3: Count SUPER_ADMIN permissions
echo ""
echo "3️⃣ SUPER_ADMIN permission count..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    r.name as role,
    COUNT(rp.permission_id) as assigned_permissions,
    (SELECT COUNT(*) FROM permissions) as total_permissions,
    ROUND(COUNT(rp.permission_id)::numeric / (SELECT COUNT(*) FROM permissions) * 100, 2) as coverage_percent
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.name = 'SUPER_ADMIN'
GROUP BY r.name;
"

# Query 4: Check specific Employer permissions assignment
echo ""
echo "4️⃣ Checking SUPER_ADMIN Employer permissions assignment..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    p.name as permission,
    CASE 
        WHEN rp.role_id IS NOT NULL THEN '✅ Assigned'
        ELSE '❌ NOT Assigned'
    END as status
FROM permissions p
LEFT JOIN role_permissions rp ON p.id = rp.permission_id 
    AND rp.role_id = (SELECT id FROM roles WHERE name = 'SUPER_ADMIN')
WHERE p.name IN ('VIEW_EMPLOYERS', 'MANAGE_EMPLOYERS')
ORDER BY p.name;
"

# Query 5: List superadmin user
echo ""
echo "5️⃣ Checking superadmin user..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    u.username,
    u.email,
    u.active,
    STRING_AGG(r.name, ', ') as roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.username = 'superadmin'
GROUP BY u.username, u.email, u.active;
"

# Query 6: Show missing permissions for SUPER_ADMIN
echo ""
echo "6️⃣ Missing permissions for SUPER_ADMIN (if any)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    p.name as missing_permission,
    p.description
FROM permissions p
WHERE NOT EXISTS (
    SELECT 1 
    FROM role_permissions rp
    WHERE rp.permission_id = p.id
      AND rp.role_id = (SELECT id FROM roles WHERE name = 'SUPER_ADMIN')
)
ORDER BY p.name
LIMIT 20;
"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Diagnostic Complete                                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "💡 Next Steps:"
echo "   1. If permissions are missing, run: ./apply_employer_fix.sh"
echo "   2. Restart the backend application"
echo "   3. Test the Employer creation API again"
echo ""
