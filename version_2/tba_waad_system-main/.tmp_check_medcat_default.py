import psycopg2
c=psycopg2.connect(host='localhost',port=5432,dbname='tba_waad_system',user='postgres',password='12345')
cur=c.cursor()
cur.execute("select column_default from information_schema.columns where table_schema='public' and table_name='medical_categories' and column_name='id'")
print(cur.fetchone())
cur.close(); c.close()
