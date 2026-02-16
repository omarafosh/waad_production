import json
from pathlib import Path

def generate_repair_sql():
    json_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\scripts\services_fully_classified.json")
    sql_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\scripts\repair_dictionary_data_v2.sql")
    
    if not json_path.exists():
        print(f"Error: {json_path} not found")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        services = json.load(f)

    sql = [
        "-- ═══════════════════════════════════════════════════════════════════════════",
        "-- REPAIR DICTIONARY DATA V2 - Syncing Metadata from JSON",
        "-- ═══════════════════════════════════════════════════════════════════════════",
        "",
        "-- 1. Ensure Categories Exist in medical_categories",
    ]
    
    # Get unique classifications
    classifications = sorted(list(set(s["classification"] for s in services if s.get("classification"))))
    
    for i, cat in enumerate(classifications):
        # Generate a unique code based on name if not available
        cat_code = f"CAT-{i+1:03d}"
        cat_escaped = cat.replace("'", "''")
        sql.append(f"INSERT INTO medical_categories (code, name, active) VALUES ('{cat_code}', '{cat_escaped}', TRUE) ON CONFLICT (name) DO NOTHING;")
        sql.append(f"INSERT INTO medical_categories (code, name, active) VALUES ('{cat_code}', '{cat_escaped}', TRUE) ON CONFLICT (code) DO NOTHING;")

    sql.append("")
    sql.append("-- 2. Update ent_medical_services with Metadata")
    
    for s in services:
        if not s.get("code"): continue
        
        name_ar = s["name_ar"].replace("'", "''")
        name_en = s.get("name_en", "").replace("'", "''")
        category = s.get("classification", "").replace("'", "''")
        sub_category = s.get("specialization", "").replace("'", "''")
        code = s["code"].replace("'", "''")
        
        # Logic for English Name fallback
        final_name_en = name_en if name_en else f"Service {code}"
            
        update = f"UPDATE ent_medical_services SET " \
                 f"name_ar = '{name_ar}', " \
                 f"name_en = '{final_name_en}', " \
                 f"category = '{category}', " \
                 f"sub_category = '{sub_category}', " \
                 f"updated_at = NOW() " \
                 f"WHERE code = '{code}';"
        sql.append(update)

    sql.append("")
    sql.append("-- 3. Sync categorization back to medical_services (Legacy table)")
    sql.append("UPDATE medical_services ms")
    sql.append("SET category_id = mc.id,")
    sql.append("    name_en = ems.name_en,")
    sql.append("    updated_at = NOW()")
    sql.append("FROM ent_medical_services ems")
    sql.append("JOIN medical_categories mc ON ems.category = mc.name")
    sql.append("WHERE ms.code = ems.code;")

    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(sql))
    
    print(f"Repair SQL v2 generated successfully at {sql_path}")

if __name__ == "__main__":
    generate_repair_sql()
