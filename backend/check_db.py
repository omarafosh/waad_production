import psycopg2

def check():
    conn = psycopg2.connect(dbname="tba_waad_system", user="postgres", password="postgres", host="localhost", port="5432")
    cur = conn.cursor()
    cur.execute("SHOW search_path")
    print(f"Path: {cur.fetchone()[0]}")
    cur.execute("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'benefit_policies'")
    print(f"Tables: {cur.fetchall()}")
    cur.close()
    conn.close()

if __name__ == "__main__":
    check()
