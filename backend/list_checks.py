import psycopg2

def list_check_constraints(table):
    conn = psycopg2.connect(dbname="tba_waad_system", user="postgres", password="postgres", host="localhost", port="5432")
    cur = conn.cursor()
    cur.execute(f"""
        SELECT conname, pg_get_constraintdef(oid)
        FROM pg_constraint
        WHERE contypid = '{table}'::regclass AND contype = 'c'
    """)
    res = cur.fetchall()
    for r in res:
        print(r)
    cur.close()
    conn.close()

if __name__ == "__main__":
    list_check_constraints("benefit_policies")
    list_check_constraints("members")
