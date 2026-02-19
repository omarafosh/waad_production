import psycopg2
from psycopg2.extras import RealDictCursor

def inspect_mapping_tables():
    try:
        conn = psycopg2.connect("host=localhost dbname=tba_waad_system user=postgres password=postgres port=5432")
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        tables = ['ent_medical_services', 'provider_service_mappings', 'ent_service_mapping_audit', 'provider_raw_services']
        
        for table in tables:
            print(f"\n--- Checking Table: {table} ---")
            cur.execute(f"""
                SELECT column_name, data_type, character_maximum_length 
                FROM information_schema.columns 
                WHERE table_name = '{table}'
                ORDER BY ordinal_position;
            """)
            cols = cur.fetchall()
            for i, col in enumerate(cols, 1):
                print(f"Column [{i}]: {col['column_name']} ({col['data_type']})")
                
                # Check for UUID strings in non-UUID columns
                if col['data_type'] in ['bigint', 'integer']:
                    try:
                        cur.execute(f"SELECT {col['column_name']} FROM {table} WHERE {col['column_name']}::text LIKE '%-%' LIMIT 1;")
                        distorted = cur.fetchone()
                        if distorted:
                            print(f"  ⚠️ ALERT: Found UUID-like data in this numeric column!")
                    except:
                        conn.rollback()
                        pass
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_mapping_tables()
