import psycopg2
conn=psycopg2.connect(host='localhost',port=5432,dbname='tba_waad_system',user='postgres',password='12345')
cur=conn.cursor()
cur.execute("""
select column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name='medical_services'
order by ordinal_position
""")
print('COLUMNS')
for r in cur.fetchall():
    print(r)
cur.close(); conn.close()
