#!/usr/bin/env python3
"""
Script: add_logo_to_database.py
Purpose: Add Waad TPA logo directly to PostgreSQL database
Usage: python3 add_logo_to_database.py
"""

import base64
import psycopg2
from pathlib import Path

# Configuration
LOGO_PATH = "/workspaces/tba_waad_system/logo Waad TPA.png"
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'tba_waad',  # Update if different
    'user': 'postgres',      # Update if different
    'password': 'postgres'   # Update if different
}

def read_logo_as_bytea():
    """Read logo file and return as bytes."""
    with open(LOGO_PATH, 'rb') as f:
        return f.read()

def update_logo_in_database():
    """Update logo in pdf_company_settings table."""
    
    print("=" * 60)
    print("  🖼️  Waad TPA Logo Database Updater")
    print("=" * 60)
    print()
    
    # Check if logo file exists
    if not Path(LOGO_PATH).exists():
        print(f"❌ Error: Logo file not found at: {LOGO_PATH}")
        return False
    
    file_size = Path(LOGO_PATH).stat().st_size
    print(f"✅ Logo file found: {LOGO_PATH}")
    print(f"   Size: {file_size:,} bytes ({file_size/1024:.1f} KB)")
    print()
    
    # Read logo data
    print("📖 Reading logo data...")
    logo_data = read_logo_as_bytea()
    print(f"✅ Logo data loaded: {len(logo_data):,} bytes")
    print()
    
    try:
        # Connect to database
        print("🔌 Connecting to PostgreSQL database...")
        print(f"   Host: {DB_CONFIG['host']}:{DB_CONFIG['port']}")
        print(f"   Database: {DB_CONFIG['database']}")
        
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✅ Connected successfully!")
        print()
        
        # Check if settings table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'pdf_company_settings'
            )
        """)
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            print("❌ Error: Table 'pdf_company_settings' does not exist.")
            print("   Please run Flyway migration first: mvn flyway:migrate")
            return False
        
        print("✅ Table 'pdf_company_settings' exists")
        print()
        
        # Check if default row exists
        cursor.execute("SELECT id, company_name FROM pdf_company_settings WHERE id = 1")
        row = cursor.fetchone()
        
        if not row:
            print("❌ Error: No default settings found (ID = 1)")
            print("   Please run Flyway migration first: mvn flyway:migrate")
            return False
        
        print(f"✅ Found settings record: ID={row[0]}, Company='{row[1]}'")
        print()
        
        # Update logo
        print("💾 Updating logo in database...")
        cursor.execute("""
            UPDATE pdf_company_settings 
            SET logo_data = %s,
                updated_at = NOW()
            WHERE id = 1
        """, (psycopg2.Binary(logo_data),))
        
        conn.commit()
        print("✅ Logo updated successfully!")
        print()
        
        # Verify update
        cursor.execute("""
            SELECT 
                CASE WHEN logo_data IS NOT NULL 
                     THEN octet_length(logo_data) 
                     ELSE 0 
                END as logo_size
            FROM pdf_company_settings 
            WHERE id = 1
        """)
        stored_size = cursor.fetchone()[0]
        
        if stored_size > 0:
            print(f"✅ Verification successful!")
            print(f"   Logo stored in database: {stored_size:,} bytes")
            print()
            print("🎉 DONE! The logo will now appear in all PDF reports.")
            print()
            print("🧪 Test it by generating a sample PDF:")
            print("   curl -X GET http://localhost:8080/api/pdf/reports/claims/sample -o test.pdf")
        else:
            print("⚠️  Warning: Logo data appears to be empty")
        
        cursor.close()
        conn.close()
        
        print()
        print("=" * 60)
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        print()
        print("💡 Troubleshooting:")
        print("   1. Check if PostgreSQL is running")
        print("   2. Verify database credentials in this script")
        print("   3. Ensure Flyway migration has been run")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = update_logo_in_database()
    exit(0 if success else 1)
