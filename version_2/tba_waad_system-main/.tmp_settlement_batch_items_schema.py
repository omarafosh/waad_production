import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, dbname='tba_waad_system', user='postgres', password='12345')
cur = conn.cursor()
cur.execute("""
select column_name,data_type,is_nullable,column_default,numeric_precision,numeric_scale,character_maximum_length
from information_schema.columns
where table_schema='public' and table_name='settlement_batch_items'
order by ordinal_position
""")
print('COLUMNS')
for r in cur.fetchall():
    print(r)
cur.execute("""
select tc.constraint_name, tc.constraint_type, kcu.column_name, ccu.table_name as ref_table, ccu.column_name as ref_col
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name=kcu.constraint_name and tc.table_schema=kcu.table_schema
left join information_schema.constraint_column_usage ccu
  on tc.constraint_name=ccu.constraint_name and tc.table_schema=ccu.table_schema
where tc.table_schema='public' and tc.table_name='settlement_batch_items'
order by tc.constraint_name,kcu.ordinal_position
""")
print('CONSTRAINTS')
for r in cur.fetchall():
    print(r)
cur.close()
conn.close()
