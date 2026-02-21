import psycopg2, datetime
conn=psycopg2.connect(host='localhost',port=5432,dbname='tba_waad_system',user='postgres',password='12345')
conn.autocommit=False
cur=conn.cursor()
code='TMP_VALIDATE_MEDSVC'
cur.execute('delete from medical_services where code=%s', (code,))
cur.execute('select id from medical_categories where id=2')
cat=cur.fetchone()
if not cat:
    cur.execute("insert into medical_categories (active, code, created_at, name, updated_at) values (true, 'TMP_CAT_2', now(), 'tmp', now()) returning id")
    cat_id=cur.fetchone()[0]
else:
    cat_id=2
cur.execute('''
insert into medical_services (active, base_price, category_id, code, created_at, description, name, requires_pa, status, updated_at)
values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
returning id
''', (True, 0, cat_id, code, datetime.datetime.now(), 'tmp desc', 'tmp name', False, 'ACTIVE', datetime.datetime.now()))
new_id=cur.fetchone()[0]
print(f'INSERT_OK id={new_id} category_id={cat_id}')
cur.execute('delete from medical_services where id=%s', (new_id,))
conn.commit()
cur.close(); conn.close()
