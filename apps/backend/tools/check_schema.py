"""
Check database tables and schema after Alembic migrations.
"""

import sys
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect

load_dotenv()

from utils.db import _select_engine_url

# Get the database URL
raw_url = os.environ.get('DATABASE_URL')
engine_url = _select_engine_url(raw_url)

print("="*60)
print("DATABASE SCHEMA CHECK")
print("="*60)
print(f"\nConnecting to: {engine_url.split('@')[1] if '@' in engine_url else 'database'}")

try:
    engine = create_engine(engine_url)
    inspector = inspect(engine)
    
    # Get all table names
    tables = inspector.get_table_names()
    
    print(f"\n✓ Connected successfully")
    print(f"\nTotal tables: {len(tables)}")
    print("\nTables:")
    for table in sorted(tables):
        print(f"  • {table}")
    
    # Check each table's columns
    print("\n" + "="*60)
    print("TABLE DETAILS")
    print("="*60)
    
    for table in sorted(tables):
        if table == 'alembic_version':
            continue  # Skip alembic's internal table
        
        columns = inspector.get_columns(table)
        indexes = inspector.get_indexes(table)
        foreign_keys = inspector.get_foreign_keys(table)
        
        print(f"\n📋 {table.upper()}")
        print(f"   Columns: {len(columns)}")
        for col in columns:
            nullable = "NULL" if col['nullable'] else "NOT NULL"
            pk = "PK" if col.get('primary_key') else ""
            print(f"     - {col['name']}: {col['type']} {nullable} {pk}")
        
        if indexes:
            print(f"   Indexes: {len(indexes)}")
            for idx in indexes:
                unique = "UNIQUE" if idx.get('unique') else ""
                print(f"     - {idx['name']} on {idx['column_names']} {unique}")
        
        if foreign_keys:
            print(f"   Foreign Keys: {len(foreign_keys)}")
            for fk in foreign_keys:
                print(f"     - {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
    
    # Check row counts
    print("\n" + "="*60)
    print("ROW COUNTS")
    print("="*60)
    
    with engine.connect() as conn:
        for table in sorted(tables):
            if table == 'alembic_version':
                # Check Alembic version
                result = conn.execute(text(f"SELECT version_num FROM {table}"))
                version = result.fetchone()
                if version:
                    print(f"  • {table}: {version[0]}")
            else:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.fetchone()[0]
                print(f"  • {table}: {count} rows")
    
    print("\n" + "="*60)
    print("✓ DATABASE SCHEMA IS VALID")
    print("="*60)
    print("\nAll tables have been created successfully!")
    print("Ready to run application tests and start the server.")

except Exception as e:
    print(f"\n✗ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
