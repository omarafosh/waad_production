#!/bin/bash
# ==============================================================================
# Generate V1_08: Indexes, Constraints, and Partial Unique Indexes
# ==============================================================================

set -e

MIGRATION_DIR="/workspaces/tba_waad_system/backend/src/main/resources/db/migration"
V001="$MIGRATION_DIR/V001__baseline_schema.sql"
NEW_DIR="/workspaces/tba_waad_system/backend/migrations_new"
OUTPUT="$NEW_DIR/V1_08__indexes_and_constraints.sql"

echo "================================================="
echo "Creating V1_08: Indexes & Constraints"
echo "================================================="

cat > "$OUTPUT" << 'EOF'
-- ============================================================================
-- INDEXES, CONSTRAINTS, AND PARTIAL UNIQUE INDEXES
-- ============================================================================
-- Version: V1_08
-- Date: 2026-02-10
-- Type: DDL ONLY
-- Purpose: Primary keys, foreign keys, unique constraints, indexes
-- NOTE: Includes partial unique indexes for soft-delete tables
-- ============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);

-- ============================================================================
-- SECTION 1: PRIMARY KEYS
-- ============================================================================

EOF

echo "Extracting PRIMARY KEYS..."
awk '/ADD CONSTRAINT.*_pkey PRIMARY KEY/ { print; print ""; }' "$V001" >> "$OUTPUT"

cat >> "$OUTPUT" << 'EOF'

-- ============================================================================
-- SECTION 2: UNIQUE CONSTRAINTS (will be replaced with partial indexes for soft-delete tables)
-- ============================================================================

EOF

echo "Extracting UNIQUE constraints..."
awk '/ADD CONSTRAINT.*UNIQUE \(/ { print; print ""; }' "$V001" >> "$OUTPUT"

cat >> "$OUTPUT" << 'EOF'

-- ============================================================================
-- SECTION 3: CHECK CONSTRAINTS
-- ============================================================================

EOF

echo "Extracting CHECK constraints..."
awk '/ADD CONSTRAINT.*CHECK \(/ { print; print ""; }' "$V001" >> "$OUTPUT"

cat >> "$OUTPUT" << 'EOF'

-- ============================================================================
-- SECTION 4: FOREIGN KEY CONSTRAINTS
-- ============================================================================

EOF

echo "Extracting FOREIGN KEYS..."
awk '/ADD CONSTRAINT.*FOREIGN KEY.*REFERENCES/ { print; print ""; }' "$V001" >> "$OUTPUT"

cat >> "$OUTPUT" << 'EOF'

-- ============================================================================
-- SECTION 5: INDEXES
-- ============================================================================

EOF

echo "Extracting INDEXES..."
awk '/^CREATE (UNIQUE )?INDEX/ { found=1 } found { print } found && /;$/ { print ""; found=0 }' "$V001" >> "$OUTPUT"

cat >> "$OUTPUT" << 'EOF'

-- ============================================================================
-- SECTION 6: PARTIAL UNIQUE INDEXES (Soft Delete Integrity)
-- ============================================================================
-- Replace full-table UNIQUE constraints with partial indexes (WHERE active = true)
-- This allows soft-deleted records to share codes while preventing duplicate active codes
-- ============================================================================

-- Remove full-table unique constraints that conflict with partial indexes
ALTER TABLE medical_categories DROP CONSTRAINT IF EXISTS medical_categories_code_key;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_code_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Create partial unique indexes (active records only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_medical_categories_code_active 
ON medical_categories(code) 
WHERE active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_medical_services_code_active 
ON medical_services(code) 
WHERE active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_code_active 
ON organizations(code) 
WHERE active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_active 
ON users(username) 
WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active 
ON users(email) 
WHERE is_active = true;

-- Comments
COMMENT ON INDEX idx_medical_categories_code_active IS 
'Prevents duplicate category codes among active records. Soft-deleted categories can share codes.';

COMMENT ON INDEX idx_medical_services_code_active IS 
'Prevents duplicate service codes among active records. Soft-deleted services can share codes.';

COMMENT ON INDEX idx_organizations_code_active IS 
'Prevents duplicate organization codes among active records. Soft-deleted orgs can share codes.';

COMMENT ON INDEX idx_users_username_active IS 
'Prevents duplicate usernames among active users. Soft-deleted users can share usernames.';

COMMENT ON INDEX idx_users_email_active IS 
'Prevents duplicate emails among active users. Soft-deleted users can share emails.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
EOF

echo "✅ V1_08 created ($(wc -l < "$OUTPUT") lines)"
echo "   - Primary keys"
echo "   - Unique constraints"
echo "   - Check constraints"
echo "   - Foreign keys"
echo "   - Indexes"
echo "   - Partial unique indexes (soft-delete safe)"
echo "================================================="
