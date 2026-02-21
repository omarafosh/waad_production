import psycopg2

def list_all_constraints(table):
    conn = psycopg2.connect(dbname="tba_waad_system", user="postgres", password="postgres", host="localhost", port="5432")
    cur = conn.cursor()
    cur.execute(f"""
        SELECT conname, contype, pg_get_constraintdef(oid)
        FROM pg_constraint
        WHERE contypid = '{table}'::regclass
    """)
    res = cur.fetchall()
    print(f"--- {table} ---")
    for r in res:
        print(r)
    cur.close()
    conn.close()

if __name__ == "__main__":
    list_all_constraints("benefit_policies")
