
import re
from pathlib import Path

source_file = r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\scripts\insert_unified_dictionary.sql"
target_file = r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\backend\src\main\resources\db\migration\V13__Seed_Unified_Dictionary.sql"

if not Path(source_file).exists():
    print(f"Error: Source file {source_file} not found.")
    exit(1)

with open(source_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

output_sql = [
    "-- ═══════════════════════════════════════════════════════════════════════════",
    "-- V13: SEED UNIFIED MEDICAL DICTIONARY",
    "-- ═══════════════════════════════════════════════════════════════════════════",
    "DELETE FROM ent_medical_services;",
    ""
]

# Regex to capture values from:
# INSERT INTO ent_medical_services (code, name_ar, name_en, category, sub_category, service_type, is_master, status, version) 
# VALUES ('WE-001', 'جهاز التنفس الاصطناعي', 'Service-WE-001', 'خدمات الرعاية بالعناية المركزه', 'إيواء', 'IPD', TRUE, 'ACTIVE', 1);

pattern = re.compile(r"INSERT INTO ent_medical_services \(.*?\) VALUES \('(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', '.*?', (.*?), '(.*?)', .*?\);")

services_data = []
categories = set()
sub_categories = set()

for line in lines:
    match = pattern.search(line)
    if match:
        code, name_ar, name_en, cat, sub_cat, is_master, status = match.groups()
        services_data.append({
            "code": code,
            "name_ar": name_ar.replace("'", "''"),
            "name_en": name_en.replace("'", "''"),
            "category": cat.replace("'", "''"),
            "sub_category": sub_cat.replace("'", "''"),
            "is_master": is_master,
            "status": status
        })
        if cat: categories.add(cat.replace("'", "''"))
        if sub_cat: sub_categories.add(sub_cat.replace("'", "''"))

# 1. Seed Categories first
output_sql.append("-- 1. SEED MEDICAL CATEGORIES")
output_sql.append("DELETE FROM medical_categories;")
for i, cat in enumerate(sorted(list(categories))):
    code = f"CAT-{i+1:03d}"
    output_sql.append(f"INSERT INTO medical_categories (code, name, active) VALUES ('{code}', '{cat}', TRUE) ON CONFLICT (code) DO NOTHING;")

output_sql.append("")

# 2. Seed Services
output_sql.append("-- 2. SEED UNIFIED MEDICAL SERVICES")
for s in services_data:
    is_active = "TRUE" if s["status"] == "ACTIVE" else "FALSE"
    sql = f"INSERT INTO ent_medical_services (code, name_ar, name_en, category, sub_category, is_master, is_active) " \
          f"VALUES ('{s['code']}', '{s['name_ar']}', '{s['name_en']}', '{s['category']}', '{s['sub_category']}', {s['is_master']}, {is_active});"
    output_sql.append(sql)

with open(target_file, 'w', encoding='utf-8') as f:
    f.write("\n".join(output_sql))

print(f"Successfully converted {len(services_data)} medical services and {len(categories)} categories to {target_file}")
