"""
Test database utilities.

Provides a separate test database configuration to prevent tests from
affecting the development database.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from utils.db import _select_engine_url, Base

load_dotenv()

# Get the main database URL
main_db_url = os.environ.get('DATABASE_URL')

# Create test database URL by appending _test to the database name
if main_db_url:
    # Parse the URL and replace the database name
    # Format: postgresql+psycopg://user:pass@host:port/dbname
    parts = main_db_url.rsplit('/', 1)
    if len(parts) == 2:
        base_url, db_name = parts
        test_db_name = f"{db_name}_test"
        TEST_DATABASE_URL = f"{base_url}/{test_db_name}"
    else:
        # Fallback: just append _test
        TEST_DATABASE_URL = f"{main_db_url}_test"
else:
    TEST_DATABASE_URL = "postgresql+psycopg://postgres:password@localhost:5432/family_tree_dev_test"

# Process the URL with our engine selector
TEST_DATABASE_URL = _select_engine_url(TEST_DATABASE_URL)

# Create test engine and session
test_engine = create_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def get_test_db():
    """Get a test database session."""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_test_db():
    """Create all tables in the test database."""
    Base.metadata.create_all(bind=test_engine)


def drop_test_db():
    """Drop all tables from the test database."""
    Base.metadata.drop_all(bind=test_engine)


def get_test_db_info():
    """Get test database information for display."""
    # Hide password in URL for security
    display_url = TEST_DATABASE_URL
    if '@' in display_url and ':' in display_url:
        # Hide password: postgresql+psycopg://user:***@host:port/db
        parts = display_url.split('@')
        if len(parts) == 2:
            user_pass = parts[0].split('://')[1]
            if ':' in user_pass:
                user = user_pass.split(':')[0]
                protocol = parts[0].split('://')[0]
                display_url = f"{protocol}://{user}:***@{parts[1]}"
    
    return {
        'url': display_url,
        'database': TEST_DATABASE_URL.split('/')[-1] if '/' in TEST_DATABASE_URL else 'unknown'
    }
