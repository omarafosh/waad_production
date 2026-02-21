import psycopg2
conn=psycopg2.connect(host='localhost',port=5432,dbname='tba_waad_system',user='postgres',password='12345')
cur=conn.cursor()
cur.execute("""
select column_name, data_type, udt_name, is_nullable
from information_schema.columns
where table_schema='public' and table_name='canonical_medical_services'
order by ordinal_position
""")
for r in cur.fetchall():
    print(r)
cur.close(); conn.close()
