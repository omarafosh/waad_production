
import psycopg2

def sync_data():
    conn_params = {
        "dbname": "tba_waad_system",
        "user": "postgres",
        "password": "postgres",
        "host": "localhost",
        "port": 5432
    }
    
    try:
        conn = psycopg2.connect(**conn_params)
        cur = conn.cursor()
        
        # 1. Get unique categories from ent_medical_services
        cur.execute("SELECT DISTINCT category FROM ent_medical_services WHERE category IS NOT NULL")
        categories = [row[0] for row in cur.fetchall()]
        
        sql_output = []
        sql_output.append("-- UI Data Synchronization & Repair Script")
        sql_output.append("BEGIN;")
        
        # 2. Insert categories into medical_categories
        sql_output.append("\n-- 1. Sync Categories")
        for i, cat in enumerate(categories):
            # Generate a code like CAT-001, CAT-002, etc.
            code = f"CAT-{i+1:03d}"
            sql_output.append(f"INSERT INTO medical_categories (code, name, active, created_at, updated_at) "
                             f"VALUES ('{code}', '{cat}', TRUE, NOW(), NOW()) "
                             f"ON CONFLICT (name) DO NOTHING; -- Assuming name might be unique or checked by code")
            # Wait, medical_categories unique constraint is on 'code'. 
            # But we want to avoid duplicate names too.
            # Let's use a more robust insert:
            sql_output.append(f"INSERT INTO medical_categories (code, name, active, created_at, updated_at) "
                             f"SELECT '{code}', '{cat}', TRUE, NOW(), NOW() "
                             f"WHERE NOT EXISTS (SELECT 1 FROM medical_categories WHERE name = '{cat}');")

        # 3. Populate legacy medical_services from ent_medical_services
        sql_output.append("\n-- 2. Populate Legacy Dictionary (medical_services)")
        sql_output.append("INSERT INTO medical_services (code, name, name_en, category_id, is_master, status, active, created_at, updated_at) "
                         "SELECT e.code, e.name_ar, e.name_en, c.id, TRUE, 'ACTIVE', TRUE, NOW(), NOW() "
                         "FROM ent_medical_services e "
                         "JOIN medical_categories c ON e.category = c.name "
                         "ON CONFLICT (code) DO UPDATE SET "
                         "name = EXCLUDED.name, name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id;")

        # 4. Populate enterprise mapping tables (ent_provider_raw_services)
        sql_output.append("\n-- 3. Populate Enterprise Mapping Tables")
        sql_output.append("INSERT INTO ent_provider_raw_services (provider_id, raw_name, raw_code, mapping_status, created_at, updated_at) "
                         "SELECT provider_id, service_name, service_code, 'UNMAPPED', NOW(), NOW() "
                         "FROM provider_raw_services "
                         "ON CONFLICT (provider_id, raw_code) DO NOTHING;")
                         
        sql_output.append("\nCOMMIT;")
        
        with open("sync_ui_data.sql", "w", encoding="utf-8") as f:
            f.write("\n".join(sql_output))
            
        print("Successfully generated sync_ui_data.sql")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn: conn.close()

if __name__ == "__main__":
    sync_data()
