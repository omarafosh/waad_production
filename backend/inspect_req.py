import psycopg2

def list_all_cols(table):
    conn = psycopg2.connect(dbname="tba_waad_system", user="postgres", password="postgres", host="localhost", port="5432")
    cur = conn.cursor()
    cur.execute(f"SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = '{table}'")
    cols = cur.fetchall()
    for c in cols:
        if c[1] == 'NO':
            print(f"REQUIRED: {c[0]}")
    cur.close()
    conn.close()

if __name__ == "__main__":
    list_all_cols("organizations")
    list_all_cols("members")
    list_all_cols("benefit_policies")
    list_all_cols("providers")
