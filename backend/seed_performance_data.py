import psycopg2
from datetime import datetime

def seed():
    conn = psycopg2.connect(dbname="tba_waad_system", user="postgres", password="postgres", host="localhost", port="5432")
    cur = conn.cursor()
    now = datetime.now()

    try:
        # Org
        cur.execute("INSERT INTO organizations (name, code, active, archived) VALUES ('Stress Org', 'STRESS', true, false) ON CONFLICT DO NOTHING")
        cur.execute("SELECT id FROM organizations WHERE code='STRESS'")
        org_id = cur.fetchone()[0]

        # Provider
        cur.execute("INSERT INTO providers (name, license_number, active, provider_type, created_at, updated_at, allow_all_employers) VALUES ('Stress Prov', 'STRESS_LIC', true, 'HOSPITAL', %s, %s, true) ON CONFLICT DO NOTHING", (now, now))
        cur.execute("SELECT id FROM providers WHERE license_number='STRESS_LIC'")
        prov_id = cur.fetchone()[0]

        # User update
        cur.execute("UPDATE users SET provider_id = %s WHERE username = 'superadmin'", (prov_id,))

        # Policy
        cur.execute("INSERT INTO benefit_policies (name, employer_org_id, annual_limit, start_date, end_date, active, status, created_at, updated_at, default_coverage_percent, distribution_type) VALUES ('Stress Policy', %s, 1000000, '2025-01-01', '2027-12-31', true, 'ACTIVE', %s, %s, 100, 'FAMILY') ON CONFLICT DO NOTHING", (org_id, now, now))
        cur.execute("SELECT id FROM benefit_policies WHERE name='Stress Policy'")
        policy_id = cur.fetchone()[0]

        # Member
        cur.execute("INSERT INTO members (full_name, card_number, employer_org_id, benefit_policy_id, active, status, created_at, updated_at, card_status, eligibility_status, gender) VALUES ('Stress Member', 'STRESS_CARD', %s, %s, true, 'ACTIVE', %s, %s, 'ACTIVE', true, 'MALE') ON CONFLICT DO NOTHING", (org_id, policy_id, now, now))
        cur.execute("SELECT id FROM members WHERE card_number='STRESS_CARD'")
        member_id = cur.fetchone()[0]

        # Visit
        cur.execute("INSERT INTO visits (member_id, provider_id, visit_date, status, active, visit_type, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id", (member_id, prov_id, now, "REGISTERED", True, "OUTPATIENT", now, now))
        visit_id = cur.fetchone()[0]

        # Service
        cur.execute("INSERT INTO medical_services (name, code, base_price, active, created_at, updated_at) VALUES ('Stress Service', 'STRESS_SRV', 100, true, %s, %s) ON CONFLICT DO NOTHING", (now, now))
        cur.execute("SELECT id FROM medical_services WHERE code='STRESS_SRV'")
        service_id = cur.fetchone()[0]

        conn.commit()
        print(f"SUCCESS: Member={member_id}, Visit={visit_id}, Service={service_id}")
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed()
