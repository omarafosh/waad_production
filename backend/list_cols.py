import psycopg2

def list_cols(table):
    conn = psycopg2.connect(dbname="tba_waad_system", user="postgres", password="postgres", host="localhost", port="5432")
    cur = conn.cursor()
    cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'")
    cols = [c[0] for c in cur.fetchall()]
    print(f"{table}: {cols}")
    cur.close()
    conn.close()

if __name__ == "__main__":
    list_cols("organizations")
    list_cols("users")
    list_cols("members")
    list_cols("visits")
