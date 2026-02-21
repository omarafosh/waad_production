import psycopg2

def execute_repair():
    try:
        conn = psycopg2.connect("host=localhost dbname=tba_waad_system user=postgres password=postgres port=5432")
        conn.autocommit = False
        cur = conn.cursor()
        
        with open('scripts/repair_distorted_data.sql', 'r', encoding='utf-8') as f:
            sql = f.read()
            
        print("Executing repair script...")
        cur.execute(sql)
        conn.commit()
        print("Repair completed successfully.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error executing repair: {e}")

if __name__ == "__main__":
    execute_repair()
