import psycopg2

def describe_table():
    try:
        conn = psycopg2.connect(
            dbname="tba_waad_system",
            user="postgres",
            password="postgres",
            host="localhost",
            port="5432"
        )
        cur = conn.cursor()
        cur.execute("""
            SELECT column_name, is_nullable, column_default, data_type
            FROM information_schema.columns
            WHERE table_name = 'users'
        """)
        columns = cur.fetchall()
        for col in columns:
            print(col)
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    describe_table()
