import psycopg2
conn=psycopg2.connect(host='localhost',port=5432,dbname='tba_waad_system',user='postgres',password='12345')
cur=conn.cursor()
search='a'
cur.execute('''
select id, canonical_service_code, service_name, service_name_ar
from canonical_medical_services
where active=true and (%s is null or lower(service_name) like lower('%%' || %s || '%%') or lower(service_name_ar) like lower('%%' || %s || '%%') or lower(canonical_service_code) like lower('%%' || %s || '%%'))
limit 5
''', (search,search,search,search))
rows=cur.fetchall()
print('OK_ROWS', len(rows))
cur.close(); conn.close()
