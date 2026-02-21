import psycopg2

def describe_table(table_name):
    try:
        conn = psycopg2.connect(
            dbname="tba_waad_system",
            user="postgres",
            password="postgres",
            host="localhost",
            port="5432"
        )
        cur = conn.cursor()
        cur.execute(f"""
            SELECT column_name, is_nullable, column_default, data_type
            FROM information_schema.columns
            WHERE table_name = '{table_name}'
        """)
        columns = cur.fetchall()
        print(f"--- {table_name} ---")
        for col in columns:
            print(col)
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    describe_table('organizations')
    describe_table('benefit_policies')
    describe_table('members')
    describe_table('providers')
    describe_table('visits')
    describe_table('medical_services')
