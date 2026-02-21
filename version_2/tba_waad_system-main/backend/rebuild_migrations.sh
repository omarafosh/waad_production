#!/bin/bash
# ==============================================================================
# Migration Rebuild Script
# Extracts table definitions from V001 and creates modular V1_XX migrations
# ==============================================================================

set -e

MIGRATION_DIR="/workspaces/tba_waad_system/backend/src/main/resources/db/migration"
V001="$MIGRATION_DIR/V001__baseline_schema.sql"
NEW_DIR="/workspaces/tba_waad_system/backend/migrations_new"

# Create working directory
mkdir -p "$NEW_DIR"

echo "=== Migration Rebuild Script ==="
echo "Source: V001__baseline_schema.sql (6581 lines)"
echo "Target: 8-10 modular migrations"
echo

# Function to extract table definition
extract_table() {
    local table_name="$1"
    local content_file="$2"
    
    # Extract CREATE TABLE statement
    awk -v table="$table_name" '
        /CREATE TABLE public\.'"$table_name"' \(/,/\);/ {
            print;
            if (/\);/) {
                print "";  # Add blank line after table
                exit;
            }
        }
    ' "$content_file"
    
    # Extract CREATE SEQUENCE
    awk -v table="$table_name" '
        /CREATE SEQUENCE public\.'"$table_name"'_id_seq/,/;/ {
            print;
            if (/;/) {
                print "";
                exit;
            }
        }
    ' "$content_file"
    
    # Extract ALTER SEQUENCE
    awk -v table="$table_name" '
        /ALTER SEQUENCE public\.'"$table_name"'_id_seq/,/;/ {
            print;
            if (/;/) {
                print "";
                exit;
            }
        }
    ' "$content_file"
}


# ==============================================================================
# V1_00: CORE ENTITIES
# ==============================================================================
echo "Creating V1_00__core_entities.sql..."
cat > "$NEW_DIR/V1_00__core_entities.sql" << 'HEADER'
-- ============================================================================
-- CORE ENTITIES: Users, Organizations, Employers, Companies, Providers
-- ============================================================================
-- Version: V1_00
-- Date: 2026-02-10
-- Type: DDL ONLY (Schema definition - NO seed data)
-- ============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

HEADER

# Extract core entity tables
for table in users organizations employers companies providers reviewer_companies; do
    echo "  - $table"
    extract_table "$table" "$V001" >> "$NEW_DIR/V1_00__core_entities.sql"
done

echo "✓ V1_00 created ($(wc -l < "$NEW_DIR/V1_00__core_entities.sql") lines)"
echo

# ==============================================================================
# V1_01: RBAC SCHEMA (DDL ONLY - NO SEED DATA)
# ==============================================================================
echo "Creating V1_01__rbac_schema.sql..."
cat > "$NEW_DIR/V1_01__rbac_schema.sql" << 'HEADER'
-- ============================================================================
-- RBAC SCHEMA: Roles, Permissions, Mappings
-- ============================================================================
-- Version: V1_01
-- Date: 2026-02-10
-- Type: DDL ONLY (NO seed data - NO role/permission inserts)
-- CRITICAL: All role-permission assignments must be done via UI only
-- SUPER_ADMIN gets all permissions dynamically in backend code
-- ============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);

/*
 * RBAC DESIGN PRINCIPLES:
 * ======================
 * 1. These tables define STRUCTURE ONLY (schema)
 * 2. NO INSERT statements for roles, permissions, or mappings
 * 3. SUPER_ADMIN role exists in code but gets permissions dynamically
 * 4. UI is the SINGLE SOURCE OF TRUTH for role-permission assignments
 * 5. Backend PermissionManager syncs UI changes to database
 * 6. Application restart does NOT reset permissions
 */

HEADER

for table in roles permissions role_permissions user_roles; do
    echo "  - $table"
    extract_table "$table" "$V001" >> "$NEW_DIR/V1_01__rbac_schema.sql"
done

echo "✓ V1_01 created ($(wc -l < "$NEW_DIR/V1_01__rbac_schema.sql") lines)"
echo

echo "=== Phase 1 Complete ==="
echo "Created: V1_00 (Core Entities), V1_01 (RBAC)"
echo "Next: Run script again for remaining migrations"
