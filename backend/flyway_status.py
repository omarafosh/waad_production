import psycopg2

def flyway():
    try:
        conn = psycopg2.connect(dbname="tba_waad_system", user="postgres", password="postgres", host="localhost", port="5432")
        cur = conn.cursor()
        cur.execute("SELECT version, description, success FROM flyway_schema_history ORDER BY version")
        res = cur.fetchall()
        for r in res:
            print(r)
        cur.close()
        conn.close()
    except Exception as e:
        print(e)

if __name__ == "__main__":
    flyway()
