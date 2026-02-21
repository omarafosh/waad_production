import psycopg2
conn=psycopg2.connect(host='localhost',port=5432,dbname='tba_waad_system',user='postgres',password='12345')
cur=conn.cursor()
cur.execute("select version, success from flyway_schema_history where version='60' order by installed_rank desc limit 1")
print('MIGRATION_V60', cur.fetchone())
cur.execute("""
select column_name,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name='medical_services'
and column_name in ('id','service_name','service_code')
order by column_name
""")
print('COLUMNS')
for r in cur.fetchall():
    print(r)
cur.close(); conn.close()
