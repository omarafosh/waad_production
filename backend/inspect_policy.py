import psycopg2

def inspect(table):
    conn = psycopg2.connect(dbname="tba_waad_system", user="postgres", password="postgres", host="localhost", port="5432")
    cur = conn.cursor()
    cur.execute(f"SELECT column_name, ordinal_position, is_nullable, column_default, data_type FROM information_schema.columns WHERE table_name = '{table}' ORDER BY ordinal_position")
    res = cur.fetchall()
    print(f"--- {table} ---")
    for r in res:
        print(f"{r[1]}: {r[0]} ({r[4]}) Nullable={r[2]} Default={r[3]}")
    cur.close()
    conn.close()

if __name__ == "__main__":
    inspect("benefit_policies")
