import psycopg2

def check_v3_data():
    try:
        conn = psycopg2.connect("host=localhost dbname=tba_waad_system user=postgres password=postgres port=5432")
        cur = conn.cursor()
        
        # Check first 20 records
        cur.execute("SELECT code, name_ar, name_en, category, sub_category FROM ent_medical_services ORDER BY code ASC LIMIT 20")
        rows = cur.fetchall()
        print("--- First 20 Records ---")
        for r in rows:
            print(r)
            
        # Check for specific service "الجلسة الثالثة" (from user image)
        print("\n--- Searching for 'الجلسة الثالثة' ---")
        cur.execute("SELECT code, name_ar, name_en, category, sub_category FROM ent_medical_services WHERE name_ar LIKE '%الجلسة الثالثة%'")
        rows = cur.fetchall()
        for r in rows:
            print(r)
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_v3_data()
