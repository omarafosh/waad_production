
import re
import os

file_path = r'd:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\backend\src\main\resources\db\migration\V13__Seed_Unified_Dictionary.sql'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Sequence Creation if not exists
sequence_sql = """
-- Create sequence for medical service codes
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_class WHERE relname = 'medical_service_code_seq') THEN
        CREATE SEQUENCE medical_service_code_seq START 1000;
    END IF;
END $$;
"""

if 'medical_service_code_seq' not in content:
    # Insert before the first medical_services insert block
    # Look for "-- 2. SEED UNIFIED MEDICAL SERVICES"
    if '-- 2. SEED UNIFIED MEDICAL SERVICES' in content:
        content = content.replace('-- 2. SEED UNIFIED MEDICAL SERVICES', sequence_sql + '\n-- 2. SEED UNIFIED MEDICAL SERVICES')
    else:
        # Fallback: append to beginning of V13 if marker not found (though we saw it in view_file)
        content = sequence_sql + '\n' + content

# 2. Regex to replace static codes
# Pattern: INSERT INTO medical_services (code, ...) VALUES ('WE-001', ...
# We want to match the static string literal provided for `code`.
# The `code` column is the FIRST column in the insert list.
# Current file content: INSERT INTO medical_services (code, name_ar, ...) VALUES ('WE-001', ...)
# We need to be careful with quotes.

# Regex explanation:
# (INSERT INTO medical_services\s*\(code,[^)]+\)\s*VALUES\s*\(\s*) -> Group 1: The prefix up to the opening paren of VALUES
# '([^']*)' -> Group 2: The code string value (we discard this)
# (\s*,) -> Group 3: The comma after the code
pattern = r"(INSERT INTO medical_services\s*\(code,[^)]+\)\s*VALUES\s*\(\s*)'[^']*'(\s*,)"

# Replacement function
def replacer(match):
    prefix = match.group(1)
    suffix = match.group(2)
    new_code_expression = "'MED-' || nextval('medical_service_code_seq')::text"
    return prefix + new_code_expression + suffix

new_content = re.sub(pattern, replacer, content, flags=re.IGNORECASE)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully updated V13 with sequential codes.")
