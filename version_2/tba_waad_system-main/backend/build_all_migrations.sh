#!/bin/bash
# ==============================================================================
# Complete Migration Rebuild Script
# Generates all V1_XX migrations from V001 baseline
# ==============================================================================

set -e

MIGRATION_DIR="/workspaces/tba_waad_system/backend/src/main/resources/db/migration"
V001="$MIGRATION_DIR/V001__baseline_schema.sql"
V006="$MIGRATION_DIR/V006__provider_account_settlement.sql"
NEW_DIR="/workspaces/tba_waad_system/backend/migrations_new"

mkdir -p "$NEW_DIR"

echo "================================================="
echo "MIGRATION REBUILD - FULL SYSTEM"
echo "================================================="
echo "Source Files:"
echo "  - V001__baseline_schema.sql (6581 lines)"
echo "  - V006__provider_account_settlement.sql"
echo "Target: 10 modular V1_XX migrations (DDL ONLY)"
echo "================================================="
echo

# Function to extract complete table with all associated objects
extract_full_table() {
    local table_name="$1"
    local source_file="$2"
    
    echo "-- ────────────────────────────────────────────────────────────────────────" >> "$current_migration"
    echo "-- ${table_name^^}" >> "$current_migration"
    echo "-- ────────────────────────────────────────────────────────────────────────" >> "$current_migration"
    
    # CREATE TABLE
    awk -v table="$table_name" '
        BEGIN { found=0 }
        /CREATE TABLE public\.'"$table_name"' \(/ { found=1 }
        found { print }
        found && /\);/ { found=0; print ""; exit }
    ' "$source_file" >> "$current_migration"
    
    # CREATE SEQUENCE
    awk -v table="$table_name" '
        BEGIN { found=0 }
        /CREATE SEQUENCE public\.'"$table_name"'_id_seq/ { found=1 }
        found { print }
        found && /;$/ { found=0; print ""; exit }
    ' "$source_file" >> "$current_migration"
    
    # ALTER SEQUENCE
    awk -v table="$table_name" '
        BEGIN { found=0 }
        /ALTER SEQUENCE public\.'"$table_name"'_id_seq/ { found=1 }
        found { print }
        found && /;$/ { found=0; print ""; exit }
    ' "$source_file" >> "$current_migration"
    
    echo "" >> "$current_migration"
}

# ==============================================================================
# V1_02: MEDICAL TAXONOMY# ==============================================================================
echo "[V1_02] Creating medical_taxonomy.sql..."
current_migration="$NEW_DIR/V1_02__medical_taxonomy.sql"
cat > "$current_migration" << 'EOF'
-- ============================================================================
-- MEDICAL TAXONOMY: Categories, Services, Packages, Codes, Conditions
-- ============================================================================
-- Version: V1_02
-- Date: 2026-02-10
-- Type: DDL ONLY
-- ============================================================================

EOF

for table in medical_categories medical_services medical_packages medical_package_services cpt_codes icd_codes chronic_conditions; do
    echo "  ✓ $table"
    extract_full_table "$table" "$V001"
done
echo "✅ V1_02 created ($(wc -l < "$current_migration") lines)"
echo

# ==============================================================================
# V1_03: MEMBERS AND VISITS (with @Version for members, visits)
# ==============================================================================
echo "[V1_03] Creating members_and_visits.sql..."
current_migration="$NEW_DIR/V1_03__members_and_visits.sql"
cat > "$current_migration" << 'EOF'
-- ============================================================================
-- MEMBERS AND VISITS: Member Management, Visit Tracking
-- ============================================================================
-- Version: V1_03  
-- Date: 2026-02-10
-- Type: DDL ONLY
-- NOTE: members and visits tables include 'version' column for optimistic locking
-- ============================================================================

EOF

for table in members member_attributes member_chronic_conditions member_import_logs member_import_errors visits visit_attachments; do
    echo "  ✓ $table"
    extract_full_table "$table" "$V001"
done

# Add version column to members table
sed -i 's/\(created_at timestamp without time zone,\)/\1\n    version bigint DEFAULT 0 NOT NULL,/' "$current_migration"
# Add version column to visits table  
sed -i 's/\(CREATE TABLE public\.visits.*created_at timestamp without time zone\)/\1,\n    version bigint DEFAULT 0 NOT NULL/' "$current_migration"

echo "✅ V1_03 created ($(wc -l < "$current_migration") lines) - includes @Version columns"
echo

# ==============================================================================
# V1_04: CLAIMS AND PRE-AUTHORIZATION (with @Version)
# ==============================================================================
echo "[V1_04] Creating claims_and_preauth.sql..."
current_migration="$NEW_DIR/V1_04__claims_and_preauth.sql"
cat > "$current_migration" << 'EOF'
-- ============================================================================
-- CLAIMS AND PRE-AUTHORIZATION: Claims Processing, Approvals
-- ============================================================================
-- Version: V1_04
-- Date: 2026-02-10
-- Type: DDL ONLY
-- NOTE: claims and pre_authorizations include 'version' column for optimistic locking
-- ============================================================================

EOF

for table in claims claim_lines claim_attachments claim_audit_logs pre_authorizations pre_authorization_attachments pre_authorization_audit preauth_attachments pre_approvals pre_approval_rules; do
    echo "  ✓ $table"
    extract_full_table "$table" "$V001"
done

# Add version columns
sed -i '/CREATE TABLE public\.claims/,/);/s/\(created_at timestamp without time zone\)/version bigint DEFAULT 0 NOT NULL,\n    \1/' "$current_migration"
sed -i '/CREATE TABLE public\.pre_authorizations/,/);/s/\(created_at timestamp without time zone\)/version bigint DEFAULT 0 NOT NULL,\n    \1/' "$current_migration"

echo "✅ V1_04 created ($(wc -l < "$current_migration") lines) - includes @Version columns"
echo

# ==============================================================================
# V1_05: FINANCIAL SETTLEMENT
# ==============================================================================
echo "[V1_05] Creating financial_settlement.sql..."
current_migration="$NEW_DIR/V1_05__financial_settlement.sql"
cat > "$current_migration" << 'EOF'
-- ============================================================================
-- FINANCIAL SETTLEMENT: Contracts, Pricing, Settlement Batches
-- ============================================================================
-- Version: V1_05
-- Date: 2026-02-10
-- Type: DDL ONLY
-- ============================================================================

EOF

# Tables from V001
for table in provider_contracts provider_contract_pricing_items legacy_provider_contracts; do
    echo "  ✓ $table (from V001)"
    extract_full_table "$table" "$V001"
done

# Tables from V006 (settlement tables)
if [ -f "$V006" ]; then
    echo "  ✓ settlement_batches (from V006)"
    echo "  ✓ settlement_batch_items (from V006)"
    echo "  ✓ account_transactions (from V006)"
    echo "  ✓ provider_accounts (from V006)"
    echo "  ✓ provider_service_prices (from V006)"
    
    # Extract settlement tables from V006
    cat "$V006" | sed -n '/CREATE TABLE.*provider_accounts/,/;$/p' >> "$current_migration"
    cat "$V006" | sed -n '/CREATE TABLE.*settlement_batches/,/;$/p' >> "$current_migration"
    cat "$V006" | sed -n '/CREATE TABLE.*settlement_batch_items/,/;$/p' >> "$current_migration"
    cat "$V006" | sed -n '/CREATE TABLE.*account_transactions/,/;$/p' >> "$current_migration"
    cat "$V006" | sed -n '/CREATE TABLE.*provider_service_prices/,/;$/p' >> "$current_migration"
fi

echo "✅ V1_05 created ($(wc -l < "$current_migration") lines)"
echo

# ==============================================================================
# V1_06: BENEFIT POLICIES
# ==============================================================================
echo "[V1_06] Creating benefit_policies.sql..."
current_migration="$NEW_DIR/V1_06__benefit_policies.sql"
cat > "$current_migration" << 'EOF'
-- ============================================================================
-- BENEFIT POLICIES: Policy Rules, Eligibility Checks
-- ============================================================================
-- Version: V1_06
-- Date: 2026-02-10
-- Type: DDL ONLY
-- ============================================================================

EOF

for table in benefit_policies benefit_policy_rules eligibility_checks; do
    echo "  ✓ $table"
    extract_full_table "$table" "$V001"
done

echo "✅ V1_06 created ($(wc -l < "$current_migration") lines)"
echo

# ==============================================================================
# V1_07: SUPPORTING SYSTEMS
# ==============================================================================
echo "[V1_07] Creating supporting_systems.sql..."
current_migration="$NEW_DIR/V1_07__supporting_systems.sql"
cat > "$current_migration" << 'EOF'
-- ============================================================================
-- SUPPORTING SYSTEMS: Audit, Tokens, Settings, Features
-- ============================================================================
-- Version: V1_07
-- Date: 2026-02-10
-- Type: DDL ONLY
-- ============================================================================

EOF

for table in provider_services audit_logs user_audit_log user_login_attempts password_reset_tokens password_reset_token email_verification_tokens pdf_company_settings company_settings system_settings feature_flags module_access; do
    echo "  ✓ $table"
    extract_full_table "$table" "$V001"
done

echo "✅ V1_07 created ($(wc -l < "$current_migration") lines)"
echo

echo "================================================="
echo "✅ ALL SCHEMA MIGRATIONS CREATED!"
echo "================================================="
echo "Next: Generate V1_08 (indexes & constraints)"
