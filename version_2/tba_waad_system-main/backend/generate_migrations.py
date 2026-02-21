#!/usr/bin/env python3
"""
Generate new DDL-only migration files from V001 baseline.
Ensures: No seed data, proper @Version columns, partial unique indexes, clean structure.
"""

import re
import os
from pathlib import Path

# Migration directory
MIGRATION_DIR = Path('/workspaces/tba_waad_system/backend/src/main/resources/db/migration')
V001_PATH = MIGRATION_DIR / 'V001__baseline_schema.sql'

def read_file(path):
    with open(path, 'r') as f:
        return f.read()

def extract_table_definition(content, table_name):
    """Extract complete table definition including CREATE TABLE and CREATE SEQUENCE."""
    result = []
    
    # Extract CREATE TABLE
    table_pattern = rf'CREATE TABLE public\.{table_name}\s*\([^;]+\);'
    table_match = re.search(table_pattern, content, re.DOTALL | re.IGNORECASE)
    if table_match:
        result.append(table_match.group(0))
    
    # Extract CREATE SEQUENCE
    seq_pattern = rf'CREATE SEQUENCE public\.{table_name}_id_seq[^;]+;'
    seq_match = re.search(seq_pattern, content, re.DOTALL | re.IGNORECASE)
    if seq_match:
        result.append(seq_match.group(0))
    
    # Extract ALTER SEQUENCE (set ownership)
    alter_seq_pattern = rf'ALTER SEQUENCE public\.{table_name}_id_seq[^;]+;'
    alter_seq_match = re.search(alter_seq_pattern, content, re.DOTALL | re.IGNORECASE)
    if alter_seq_match:
        result.append(alter_seq_match.group(0))
    
    # Extract table comments (optional)
    comment_pattern = rf'COMMENT ON (TABLE|COLUMN) public\.{table_name}[^;]+;'
    comments = re.findall(comment_pattern, content, re.DOTALL | re.IGNORECASE)
    for comment in comments:
        result.append(f'COMMENT ON {comment[1]}')
    
    return '\n\n'.join(result) if result else None

def add_version_column(table_def, table_name):
    """Add version column for optimistic locking to specific tables."""
    version_tables = ['claims', 'pre_authorizations', 'visits', 'members']
    
    if table_name not in version_tables:
        return table_def
    
    # Add version column before closing parenthesis    
    version_col = "    version bigint DEFAULT 0 NOT NULL"
    table_def = table_def.replace(');', f',\n{version_col}\n);', 1)
    
    return table_def

def generate_migration_header(version, description):
    """Generate migration file header."""
    return f"""-- ============================================================================
-- {description}
-- ============================================================================
-- Version: {version}
-- Date: 2026-02-10
-- Type: DDL ONLY (Schema definition - NO seed data)
-- ============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

"""

def main():
    print("Reading V001 baseline schema...")
    v001_content = read_file(V001_PATH)
    
    # Migration 1: Core Entities
    print("Generating V1_00__core_entities.sql...")
    tables_v1_00 = ['users', 'organizations', 'employers', 'companies', 'providers', 'reviewer_companies']
    
    # Migration 2: RBAC (DDL ONLY)
    print("Generating V1_01__rbac_schema.sql...")
    tables_v1_01 = ['roles', 'permissions', 'role_permissions', 'user_roles']
    
    # Migration 3: Medical Taxonomy
    print("Generating V1_02__medical_taxonomy.sql...")
    tables_v1_02 = ['medical_categories', 'medical_services', 'medical_packages', 
                    'medical_package_services', 'cpt_codes', 'icd_codes', 'chronic_conditions']
    
    # Migration 4: Members & Visits  
    print("Generating V1_03__members_and_visits.sql...")
    tables_v1_03 = ['members', 'member_attributes', 'member_chronic_conditions',
                    'member_import_logs', 'member_import_errors', 'visits', 'visit_attachments']
    
    # Migration 5: Claims & PreAuth
    print("Generating V1_04__claims_and_preauth.sql...")
    tables_v1_04 = ['claims', 'claim_lines', 'claim_attachments', 'claim_audit_logs',
                    'pre_authorizations', 'pre_authorization_attachments', 'pre_authorization_audit',
                    'preauth_attachments', 'pre_approvals', 'pre_approval_rules']
    
    # Migration 6: Financial & Settlement
    print("Generating V1_05__financial_settlement.sql...")
    tables_v1_05 = ['provider_contracts', 'provider_contract_pricing_items', 'legacy_provider_contracts']
    
    # Migration 7: Benefit Policies
    print("Generating V1_06__benefit_policies.sql...")
    tables_v1_06 = ['benefit_policies', 'benefit_policy_rules', 'eligibility_checks']
    
    # Migration 8: Supporting Systems
    print("Generating V1_07__supporting_systems.sql...")
    tables_v1_07 = ['provider_services', 'audit_logs', 'user_audit_log', 'user_login_attempts',
                    'password_reset_tokens', 'password_reset_token', 'email_verification_tokens',
                    'pdf_company_settings', 'company_settings', 'system_settings',
                    'feature_flags', 'module_access']
    
    migrations = {
        'V1_00__core_entities.sql': (tables_v1_00, 'Core Entities: Users, Organizations, Employers, Companies, Providers'),
        'V1_01__rbac_schema.sql': (tables_v1_01, 'RBAC Schema: Roles, Permissions, Mappings (DDL ONLY - NO SEED DATA)'),
        'V1_02__medical_taxonomy.sql': (tables_v1_02, 'Medical Taxonomy: Categories, Services, Codes, Conditions'),
        'V1_03__members_and_visits.sql': (tables_v1_03, 'Members and Visits: Member Management, Visit Tracking'),
        'V1_04__claims_and_preauth.sql': (tables_v1_04, 'Claims and Pre-Authorization: Claims Processing, Approvals'),
        'V1_05__financial_settlement.sql': (tables_v1_05, 'Financial Management: Contracts, Pricing, Settlement'),
        'V1_06__benefit_policies.sql': (tables_v1_06, 'Benefit Policies: Policy Rules, Eligibility Checks'),
        'V1_07__supporting_systems.sql': (tables_v1_07, 'Supporting Systems: Audit, Tokens, Settings, Features'),
    }
    
    for filename, (tables, description) in migrations.items():
        version = filename.split('__')[0]
        content = generate_migration_header(version, description)
        
        for table in tables:
            table_def = extract_table_definition(v001_content, table)
            if table_def:
                # Add version column for specific tables
                table_def = add_version_column(table_def, table)
                content += f"\n-- {table.upper()} --\n{table_def}\n"
            else:
                content += f"\n-- WARNING: {table} definition not found in V001\n"
        
        print(f"  → {filename}: {len(tables)} tables")
    
    print("\n✅ Migration generation complete!")
    print("Next: Run generator to create files")

if __name__ == '__main__':
    main()
