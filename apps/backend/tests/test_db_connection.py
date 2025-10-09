"""
Quick diagnostic script to test database connection and show the actual connection string being used.
"""

import os
import sys
from dotenv import load_dotenv
from urllib.parse import unquote

# Add parent directory to path to import backend modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

load_dotenv()

# Get the raw DATABASE_URL from environment
raw_url = os.environ.get('DATABASE_URL', 'NOT SET')

print("="*60)
print("DATABASE CONNECTION DIAGNOSTICS")
print("="*60)
print(f"\n1. Raw DATABASE_URL from .env:")
print(f"   {raw_url}")

# Try to decode URL-encoded password
if 'postgresql' in raw_url:
    # Extract password part
    if '@' in raw_url:
        before_at = raw_url.split('@')[0]
        if ':' in before_at:
            password_part = before_at.split(':')[-1]
            decoded_password = unquote(password_part)
            print(f"\n2. Detected URL-encoded password:")
            print(f"   Encoded: {password_part}")
            print(f"   Decoded: {decoded_password}")
            
            # Show what the connection string should be
            decoded_url = raw_url.replace(password_part, decoded_password)
            print(f"\n3. Decoded DATABASE_URL:")
            print(f"   {decoded_url}")

print("\n" + "="*60)
print("TESTING CONNECTION")
print("="*60)

try:
    from sqlalchemy import create_engine
    from utils.db import _select_engine_url
    
    # Get the engine URL
    engine_url = _select_engine_url(raw_url)
    print(f"\n4. SQLAlchemy engine URL:")
    print(f"   {engine_url}")
    
    # Try to create engine and connect
    print("\n5. Attempting to connect...")
    engine = create_engine(engine_url)
    
    with engine.connect() as conn:
        from sqlalchemy import text
        result = conn.execute(text("SELECT version()"))
        version = result.fetchone()[0]
        print(f"   ✓ SUCCESS! Connected to PostgreSQL")
        print(f"   Version: {version}")
        
except Exception as e:
    print(f"   ✗ FAILED! Could not connect to database")
    print(f"   Error: {e}")
    print("\n" + "="*60)
    print("TROUBLESHOOTING TIPS")
    print("="*60)
    print("\n1. Check if PostgreSQL is running:")
    print("   sudo systemctl status postgresql")
    print("\n2. Verify the password in .env matches your PostgreSQL user password")
    print("\n3. Test connection manually:")
    print("   psql -U postgres -d family_tree_dev")
    print("\n4. If password has special characters, URL-encode them:")
    print("   ! = %21, @ = %40, # = %23, $ = %24, etc.")
    print("\n5. Or use double %% for percent encoding in .env:")
    print("   Example: %%21 for !, %%40 for @")
    sys.exit(1)

print("\n" + "="*60)
print("✓ DATABASE CONNECTION SUCCESSFUL")
print("="*60)
