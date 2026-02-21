import psycopg2
import json

def get_data():
    try:
        conn = psycopg2.connect(
            dbname="tba_waad_system",
            user="postgres",
            password="postgres",
            host="localhost",
            port="5432"
        )
        cur = conn.cursor()
        
        # Get a provider user
        cur.execute("""
            SELECT u.username, u.password 
            FROM users u 
            JOIN user_roles ur ON u.id = ur.user_id 
            JOIN roles r ON ur.role_id = r.id 
            WHERE r.name = 'PROVIDER' AND u.active = true 
            LIMIT 1
        """)
        provider_user = cur.fetchone()
        
        # Get a member
        cur.execute("SELECT id FROM members WHERE active = true LIMIT 1")
        member = cur.fetchone()
        
        # Get a visit for that member
        if member:
            cur.execute("SELECT id FROM visits WHERE member_id = %s AND active = true LIMIT 1", (member[0],))
            visit = cur.fetchone()
        else:
            visit = None

        # Get a medical service
        cur.execute("SELECT id FROM medical_services WHERE active = true LIMIT 1")
        service = cur.fetchone()

        result = {
            "provider_user": provider_user,
            "member_id": member[0] if member else None,
            "visit_id": visit[0] if visit else None,
            "service_id": service[0] if service else None
        }
        print(json.dumps(result))
        
        cur.close()
        conn.close()
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    get_data()
