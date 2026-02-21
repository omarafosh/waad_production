import psycopg2

def list_constraints(table):
    conn = psycopg2.connect(dbname="tba_waad_system", user="postgres", password="postgres", host="localhost", port="5432")
    cur = conn.cursor()
    cur.execute(f"""
        SELECT conname, pg_get_constraintdef(c.oid)
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE contypid = '{table}'::regclass
    """)
    res = cur.fetchall()
    for r in res:
        print(r)
    cur.close()
    conn.close()

if __name__ == "__main__":
    list_constraints("organizations")
