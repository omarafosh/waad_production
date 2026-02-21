import psycopg2

def list_all_cols(table):
    conn = psycopg2.connect(dbname="tba_waad_system", user="postgres", password="postgres", host="localhost", port="5432")
    cur = conn.cursor()
    cur.execute(f"""
        SELECT column_name, is_nullable, column_default, data_type 
        FROM information_schema.columns 
        WHERE table_name = '{table}'
    """)
    cols = cur.fetchall()
    print(f"--- {table} ---")
    for c in cols:
        print(c)
    cur.close()
    conn.close()

if __name__ == "__main__":
    list_all_cols("organizations")
