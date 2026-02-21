import sys
import psycopg2

TABLE = sys.argv[1]

conn = psycopg2.connect(host='localhost', dbname='tba_waad_system', user='postgres', password='12345')
cur = conn.cursor()

cur.execute("""
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name=%s
ORDER BY ordinal_position
""", (TABLE,))
print('COLUMNS:')
for row in cur.fetchall():
    print(row)

cur.execute("""
SELECT tc.constraint_name,
       tc.constraint_type,
       kcu.column_name,
       ccu.table_name AS foreign_table,
       ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name=kcu.constraint_name
 AND tc.table_schema=kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name=tc.constraint_name
 AND ccu.table_schema=tc.table_schema
WHERE tc.table_schema='public'
  AND tc.table_name=%s
ORDER BY tc.constraint_type, tc.constraint_name
""", (TABLE,))
print('\nCONSTRAINTS:')
for row in cur.fetchall():
    print(row)

cur.execute("""
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname='public' AND tablename=%s
ORDER BY indexname
""", (TABLE,))
print('\nINDEXES:')
for row in cur.fetchall():
    print(row)

cur.close()
conn.close()
