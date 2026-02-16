import json
from pathlib import Path

# Mapping of source filename to Provider Name/Info
PROVIDER_INFO = {
    "قائمة اسعار خدمات دار الشفاء مصنفة.xlsx": {"name": "دار الشفاء", "license": "P-DAR-001"},
    "قائمة اسعار عمليات دار الشفاء مصنفة.xlsx": {"name": "دار الشفاء", "license": "P-DAR-001"},
    "قائمة مفصلة اسعار مستشفى فينيسيا.xlsx": {"name": "مستشفى فينيسيا", "license": "P-VEN-002"},
    "مركز دنتال لطب الاسنان.xlsx": {"name": "مركز دنتال", "license": "P-DEN-003"}
}

def generate_mapping_sql():
    json_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\scripts\services_fully_classified.json")
    sql_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\scripts\bind_provider_services.sql")
    schema_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\medical_catalog_schema.sql")
    
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()

    with open(json_path, 'r', encoding='utf-8') as f:
        services = json.load(f)

    sql = [
        "-- 0. Setup Schema",
        schema_sql,
        "",
        "-- 1. Create Providers if not exist"
    ]
    
    # Track unique providers by license to avoid duplicates in the SQL script
    seen_licenses = set()
    for info in PROVIDER_INFO.values():
        if info["license"] not in seen_licenses:
            sql.append(f"INSERT INTO providers (name, license_number, provider_type, active, created_at, updated_at, network_status, allow_all_employers) "
                       f"VALUES ('{info['name']}', '{info['license']}', 'HOSPITAL', TRUE, NOW(), NOW(), 'IN_NETWORK', TRUE) "
                       f"ON CONFLICT (license_number) DO NOTHING;")
            seen_licenses.add(info["license"])

    sql.append("")
    sql.append("-- 2. Bind Services")

    for s in services:
        provider_license = PROVIDER_INFO.get(s["source"], {}).get("license")
        if not provider_license: continue
        
        # Skip invalid or empty codes
        if not s.get("code") or not s["code"].strip():
            continue
        
        provider_subquery = f"(SELECT id FROM providers WHERE license_number = '{provider_license}' LIMIT 1)"
        master_subquery = f"(SELECT id FROM ent_medical_services WHERE code = '{s['code']}' LIMIT 1)"
        
        # Insert into Raw
        raw_insert = f"INSERT INTO provider_raw_services (provider_id, service_code, service_name, active, created_at, updated_at) " \
                     f"VALUES ({provider_subquery}, '{s['code']}', '{s['name_ar'].replace("'", "''")}', TRUE, NOW(), NOW()) " \
                     f"ON CONFLICT (provider_id, service_code) DO NOTHING;"
        
        # Insert into Mapping
        mapping_insert = f"INSERT INTO provider_service_mappings (provider_id, provider_service_code, master_service_id, active, created_at, updated_at, mapping_confidence, reason_code) " \
                         f"VALUES ({provider_subquery}, '{s['code']}', {master_subquery}, TRUE, NOW(), NOW(), 1.0, 'DIRECT_IMPORT') " \
                         f"ON CONFLICT (provider_id, provider_service_code) DO NOTHING;"
        
        sql.append(raw_insert)
        sql.append(mapping_insert)

    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(sql))
    
    print(f"Mapping SQL generated for {len(services)} services.")

if __name__ == "__main__":
    generate_mapping_sql()
