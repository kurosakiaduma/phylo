from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Default to a Postgres URL, but be resilient if the driver isn't installed in the venv.
raw_database_url = os.environ.get(
    'DATABASE_URL', None
)

def _select_engine_url(raw_url: str) -> str:
    """Return a SQLAlchemy-compatible URL, trying to prefer psycopg (psycopg3) if available.

    If neither psycopg nor psycopg2 is installed, fall back to a local sqlite file for
    developer convenience so the server can start without requiring Postgres.
    """
    # If it's not a postgres URL, return as-is (e.g., sqlite://...)
    if not raw_url.startswith('postgres'):
        return raw_url


    # If the URL already specifies a driver (e.g., postgresql+psycopg://), return as-is
    proto = raw_url.split('://', 1)[0]
    if '+' in proto:
        return raw_url

    # Try psycopg (psycopg3) first
    try:
        import psycopg  # type: ignore
        logger.debug('Using psycopg (psycopg3) driver')
        return raw_url.replace('postgresql://', 'postgresql+psycopg://', 1)
    except Exception:
        pass

    # Next try psycopg2
    try:
        import psycopg2  # type: ignore
        logger.debug('Using psycopg2 driver')
        return raw_url.replace('postgresql://', 'postgresql+psycopg2://', 1)
    except Exception:
        pass

    # Fall back to sqlite for local development to avoid crashing the app on import.
    logger.warning(
        'No Postgres DB driver (psycopg or psycopg2) found in the virtualenv; falling back to sqlite:///./dev.db for local development.'
    )
    return 'sqlite:///./dev.db'


DATABASE_URL = _select_engine_url(raw_database_url)

# Create engine and sessionmaker
engine = create_engine(DATABASE_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
