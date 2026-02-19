import psycopg2

def execute_v3_init():
    try:
        conn = psycopg2.connect("host=localhost dbname=tba_waad_system user=postgres password=postgres port=5432")
        conn.autocommit = False
        cur = conn.cursor()
        
        with open('scripts/archive_and_recreate_v3.sql', 'r', encoding='utf-8') as f:
            sql = f.read()
            
        print("Archiving and recreating table...")
        cur.execute(sql)
        conn.commit()
        print("Initialization completed successfully.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    execute_v3_init()
