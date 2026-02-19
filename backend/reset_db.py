import psycopg2
import sys

# Connection params from application.yml
DB_NAME = "tba_waad_system"
DB_USER = "postgres"
DB_PASS = "postgres"
DB_HOST = "localhost"
DB_PORT = "5432"

try:
    print(f"Connecting to {DB_NAME} on {DB_HOST}:{DB_PORT}...")
    conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASS, host=DB_HOST, port=DB_PORT)
    conn.autocommit = True
    
    with conn.cursor() as cur:
        print("Dropping schema public...")
        cur.execute("DROP SCHEMA IF EXISTS public CASCADE;")
        print("Creating schema public...")
        cur.execute("CREATE SCHEMA public;")
        cur.execute("GRANT ALL ON SCHEMA public TO postgres;")
        cur.execute("GRANT ALL ON SCHEMA public TO public;")
        
    print("SUCCESS: Database schema has been reset.")
    conn.close()
except Exception as e:
    print(f"ERROR: Failed to reset database. {e}")
    sys.exit(1)
