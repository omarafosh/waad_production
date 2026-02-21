#!/usr/bin/env python3
"""
Extract and reorganize V001 baseline schema into logical migration groups.
This script helps transition from monolithic V001 to modular V1_XX migrations.
"""

import re

def read_v001():
    with open('/workspaces/tba_waad_system/backend/src/main/resources/db/migration/V001__baseline_schema.sql', 'r') as f:
        return f.read()

def extract_table_groups(content):
    """Extract table definitions organized by business domain."""
    
    # Define table groups with their business domains
    groups = {
        'core_identity': [
            'users', 'organizations', 'employers', 'companies', 'providers', 
            'provider_accounts', 'reviewer_companies'
        ],
        'rbac': [
            'roles', 'permissions', 'role_permissions', 'user_roles'
        ],
        'medical_taxonomy': [
            'medical_categories', 'medical_services', 'canonical_medical_services',
            'medical_packages', 'medical_package_services', 'cpt_codes', 'icd_codes',
            'chronic_conditions'
        ],
        'members_visits': [
            'members', 'member_attributes', 'member_chronic_conditions',
            'member_import_logs', 'member_import_errors', 'visits', 'visit_attachments'
        ],
        'claims_preauth': [
            'claims', 'claim_lines', 'claim_attachments', 'claim_audit_logs',
            'pre_authorizations', 'pre_authorization_attachments', 'pre_authorization_audit',
            'preauth_attachments', 'pre_approvals', 'pre_approval_rules'
        ],
        'financial': [
            'account_transactions', 'settlement_batches', 'settlement_batch_items',
            'provider_service_prices', 'provider_service_price_import_logs',
            'provider_contracts', 'provider_contract_pricing_items',
            'legacy_provider_contracts'
        ],
        'benefit_policies': [
            'benefit_policies', 'benefit_policy_rules', 'eligibility_checks'
        ],
        'supporting_systems': [
            'provider_admin_documents', 'provider_allowed_employers', 'provider_services',
            'audit_logs', 'user_audit_log', 'user_login_attempts',
            'password_reset_tokens', 'password_reset_token', 'email_verification_tokens',
            'pdf_company_settings', 'company_settings', 'system_settings',
            'feature_flags', 'module_access'
        ]
    }
    
    # Extract each table's complete definition (table + sequence + constraints)
    result = {group: [] for group in groups.keys()}
    
    for group, tables in groups.items():
        for table in tables:
            # Extract table definition
            table_pattern = rf'CREATE TABLE public\.{table}\s*\([^;]+\);'
            table_match = re.search(table_pattern, content, re.DOTALL | re.IGNORECASE)
            
            if table_match:
                result[group].append({
                    'table': table,
                    'definition': table_match.group(0),
                    'line': content[:table_match.start()].count('\n') + 1
                })
    
    return result, groups

def main():
    print("Extracting schema from V001...")
    content = read_v001()
    
    table_groups, group_names = extract_table_groups(content)
    
    print("\n=== SCHEMA ORGANIZATION ===\n")
    for group, data in table_groups.items():
        tables = [item['table'] for item in data]
        print(f"{group.upper()} ({len(tables)} tables):")
        for table in tables:
            print(f"  - {table}")
        print()
    
    # Print total stats
    total_tables = sum(len(data) for data in table_groups.values())
    print(f"Total tables extracted: {total_tables}")
    
    # Check for missing tables
    all_extracted = set()
    for data in table_groups.values():
        all_extracted.update(item['table'] for item in data)
    
    # Get actual tables from DB
    expected_tables = {
        'users', 'organizations', 'employers', 'companies', 'providers', 'reviewer_companies',
        'roles', 'permissions', 'role_permissions', 'user_roles',
        'medical_categories', 'medical_services', 'medical_packages', 'medical_package_services',
        'cpt_codes', 'icd_codes', 'chronic_conditions',
        'members', 'member_attributes', 'member_chronic_conditions',
        'member_import_logs', 'member_import_errors', 'visits', 'visit_attachments',
        'claims', 'claim_lines', 'claim_attachments', 'claim_audit_logs',
        'pre_authorizations', 'pre_authorization_attachments', 'pre_authorization_audit',
        'preauth_attachments', 'pre_approvals', 'pre_approval_rules',
        'account_transactions', 'settlement_batches', 'settlement_batch_items',
        'provider_service_prices', 'provider_contracts', 'provider_contract_pricing_items',
        'legacy_provider_contracts',
        'benefit_policies', 'benefit_policy_rules', 'eligibility_checks',
        'provider_services', 'audit_logs', 'user_audit_log', 'user_login_attempts',
        'password_reset_tokens', 'password_reset_token', 'email_verification_tokens',
        'pdf_company_settings', 'company_settings', 'system_settings',
        'feature_flags', 'module_access'
    }
    
    missing = expected_tables - all_extracted
    if missing:
        print(f"\n⚠️  Missing tables: {missing}")

if __name__ == '__main__':
    main()
