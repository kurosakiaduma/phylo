"""Reset alembic_version table and apply migrations fresh."""

from sqlalchemy import create_engine, text
from utils.db import _select_engine_url
import os
from dotenv import load_dotenv

load_dotenv()

engine = create_engine(_select_engine_url(os.environ.get('DATABASE_URL')))

print("Resetting alembic_version table...")
with engine.connect() as conn:
    conn.execute(text('DELETE FROM alembic_version'))
    conn.commit()
    print('✓ Reset alembic_version table')

print("\nNow run: alembic upgrade head")
