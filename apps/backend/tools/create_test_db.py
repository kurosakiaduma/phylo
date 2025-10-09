"""
Create test database if it doesn't exist.

This script creates a separate test database so that tests don't affect
the development database.
"""

import psycopg
import os
from dotenv import load_dotenv
from urllib.parse import unquote

load_dotenv()

# Get the main database URL
main_db_url = os.environ.get('DATABASE_URL')

# Extract connection details
if main_db_url:
    # Format: postgresql+psycopg://user:pass@host:port/dbname
    parts = main_db_url.split('://')
    if len(parts) == 2:
        # Extract user, password, host, port, database
        auth_host = parts[1].split('@')
        if len(auth_host) == 2:
            auth = auth_host[0]
            host_db = auth_host[1]
            
            user_pass = auth.split(':')
            user = user_pass[0]
            password = unquote(':'.join(user_pass[1:])) if len(user_pass) > 1 else ''
            
            host_port_db = host_db.split('/')
            host_port = host_port_db[0]
            db_name = host_port_db[1] if len(host_port_db) > 1 else 'family_tree_dev'
            
            host_parts = host_port.split(':')
            host = host_parts[0]
            port = host_parts[1] if len(host_parts) > 1 else '5432'
            
            test_db_name = f"{db_name}_test"
            
            print("="*60)
            print("TEST DATABASE SETUP")
            print("="*60)
            print(f"\nMain database: {db_name}")
            print(f"Test database: {test_db_name}")
            print(f"Host: {host}:{port}")
            print(f"User: {user}")
            
            try:
                # Connect to postgres database to create test database
                conn = psycopg.connect(
                    host=host,
                    port=port,
                    user=user,
                    password=password,
                    dbname='postgres'
                )
                conn.autocommit = True
                
                with conn.cursor() as cur:
                    # Check if test database exists
                    cur.execute(
                        "SELECT 1 FROM pg_database WHERE datname = %s",
                        (test_db_name,)
                    )
                    exists = cur.fetchone()
                    
                    if exists:
                        print(f"\n✓ Test database '{test_db_name}' already exists")
                    else:
                        # Create test database
                        cur.execute(f'CREATE DATABASE "{test_db_name}"')
                        print(f"\n✓ Created test database '{test_db_name}'")
                
                conn.close()
                
                print("\n" + "="*60)
                print("✓ TEST DATABASE READY")
                print("="*60)
                print("\nYou can now run tests with:")
                print("  python test_relationships.py")
                print("  python test_tree_validation.py")
                print("  python test_member_management.py")
                print("  python test_auth_flow.py")
                
            except Exception as e:
                print(f"\n✗ Error: {e}")
                print("\nMake sure PostgreSQL is running and credentials are correct.")
                import traceback
                traceback.print_exc()
                exit(1)
        else:
            print("✗ Could not parse database URL")
            exit(1)
    else:
        print("✗ Could not parse database URL")
        exit(1)
else:
    print("✗ DATABASE_URL not found in environment")
    exit(1)
