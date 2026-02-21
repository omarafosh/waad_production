import psycopg2, datetime
conn=psycopg2.connect(host='localhost',port=5432,dbname='tba_waad_system',user='postgres',password='12345')
conn.autocommit=False
cur=conn.cursor()
now=datetime.datetime.now()
code='TMP_VALIDATE_MEDCAT_ID'
cur.execute("delete from medical_categories where code=%s", (code,))
cur.execute("insert into medical_categories (active,code,created_at,name,parent_id,updated_at) values (%s,%s,%s,%s,%s,%s) returning id", (True,code,now,'Temporary Validation',None,now))
new_id=cur.fetchone()[0]
print(f'INSERT_OK id={new_id}')
cur.execute("delete from medical_categories where id=%s", (new_id,))
conn.commit()
cur.close(); conn.close()
