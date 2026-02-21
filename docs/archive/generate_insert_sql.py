import json
from pathlib import Path

# Mapping for ServiceType Enum
SERVICE_TYPE_MAP = {
    "LABS": "LAB",
    "تحاليل طبية": "LAB",
    "RADIOLOGY": "RAD",
    "اشعة": "RAD",
    "آشعة": "RAD",
    "عيادات خارجية": "OPD",
    "إيواء": "IPD",
    "عمليات": "SURG",
    "SURGERY": "SURG",
    "DENTAL": "OPD", # Dental is usually OPD unless specified otherwise
    "اسنان": "OPD",
}

def map_service_type(data):
    # Try mapping from classification first
    cls = data.get("classification", "").strip()
    spc = data.get("specialization", "").strip()
    
    for key, val in SERVICE_TYPE_MAP.items():
        if key in cls or key in spc:
            return val
            
    # Default based on keywords
    if "كشف" in data.get("name_ar", ""): return "OPD"
    if "تحليل" in data.get("name_ar", ""): return "LAB"
    if "أشعة" in data.get("name_ar", ""): return "RAD"
    
    return "OPD" # Default

def generate_sql():
    input_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\scripts\services_fully_classified.json")
    output_path = Path(r"d:\Backend\waadTbaSystem2026-main_final\waadTbaSystem2026-main\scripts\insert_unified_dictionary.sql")
    
    if not input_path.exists():
        print("Input file not found")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        services = json.load(f)

    sql_statements = [
        "-- Unified Medical Dictionary Import",
        "TRUNCATE TABLE ent_medical_services CASCADE;",
        ""
    ]
    
    seen_codes = set()
    
    for s in services:
        name_ar = s["name_ar"].replace("'", "''")
        name_en = s["name_en"].replace("'", "''")
        if not name_en:
            # Fallback English
            name_en = f"Service-{s['code']}" if s['code'] else name_ar
            
        code = s["code"] or f"MST-{len(seen_codes)+1:05d}"
        
        # Ensure code is unique
        base_code = code
        counter = 1
        while code in seen_codes:
            code = f"{base_code}-{counter}"
            counter += 1
        seen_codes.add(code)
        
        category = s["specialization"].replace("'", "''")
        sub_category = s["classification"].replace("'", "''")
        service_type = map_service_type(s)
        
        stmt = f"INSERT INTO ent_medical_services (code, name_ar, name_en, category, sub_category, service_type, is_master, status, version) " \
               f"VALUES ('{code}', '{name_ar}', '{name_en}', '{category}', '{sub_category}', '{service_type}', TRUE, 'ACTIVE', 1);"
        sql_statements.append(stmt)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(sql_statements))
        
    print(f"SQL script generated: {len(services)} records.")
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    generate_sql()
