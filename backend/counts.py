import psycopg2

def counts():
    conn = psycopg2.connect(dbname="tba_waad_system", user="postgres", password="postgres", host="localhost", port="5432")
    cur = conn.cursor()
    tables = ['users', 'roles', 'organizations', 'members', 'providers', 'visits', 'medical_services', 'benefit_policies']
    for t in tables:
        try:
            cur.execute(f"SELECT count(*) FROM {t}")
            print(f"{t}: {cur.fetchone()[0]}")
        except:
            conn.rollback()
            print(f"{t}: Error or Missing")
    cur.close()
    conn.close()

if __name__ == "__main__":
    counts()
