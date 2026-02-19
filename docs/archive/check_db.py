import psycopg2
from psycopg2.extras import RealDictCursor

def check_distorted_data():
    try:
        conn = psycopg2.connect("host=localhost dbname=tba_waad_system user=postgres password=postgres port=5432")
        cur = conn.cursor(cursor_factory=RealDictCursor)
        codes = ['HCG RAPID.', 'OC23', '0P11', '0P12', '1950']
        print(f"Checking specific codes: {codes}")
        
        cur.execute("SELECT code, name_ar, name_en, category, sub_category FROM ent_medical_services WHERE code = ANY(%s);", (codes,))
        rows = cur.fetchall()
        for row in rows:
            print(f"Code: {row['code']}")
            print(f"Name (AR): {row['name_ar']}")
            print(f"Name (EN): {row['name_en']}")
            print(f"Category: {row['category']}")
            print(f"SubCategory: {row['sub_category']}")
            print("-" * 30)
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_distorted_data()
