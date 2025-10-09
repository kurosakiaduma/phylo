# Backend Directory Structure

This document describes the organization of the Family Tree backend codebase.

## Directory Structure

```
apps/backend/
├── api/              # API endpoint handlers
│   ├── auth.py           # Authentication endpoints
│   ├── invites.py        # Invitation management
│   ├── main.py           # FastAPI app entry point
│   ├── members.py        # Member CRUD endpoints
│   ├── relationships.py  # Relationship management
│   └── trees.py          # Tree CRUD endpoints
│
├── docs/             # Documentation files
│   ├── AUTHENTICATION.md
│   ├── DATABASE_SETUP.md
│   ├── MEMBER_MANAGEMENT.md
│   ├── MEMBER_MANAGEMENT_QUICK_REF.md
│   ├── PHASE_2.4_SUMMARY.md
│   ├── PHASE_2.5.1_VALIDATION_SUMMARY.md
│   ├── PHASE_2.5_SUMMARY.md
│   ├── PHASE_2.6_SUMMARY.md
│   ├── PHASE_2.7_SUMMARY.md
│   ├── QUICKSTART.md
│   ├── README_PHASE_2.4.md
│   ├── RELATIONSHIPS.md
│   ├── RELATIONSHIPS_QUICK_REF.md
│   ├── TREE_SETTINGS_VALIDATION.md
│   ├── VALIDATION_COMPLETE.md
│   ├── VALIDATION_FLOW_DIAGRAMS.md
│   └── VALIDATION_QUICK_REFERENCE.md
│
├── migrations/       # Alembic database migrations
│   ├── env.py
│   └── versions/
│
├── models/           # SQLAlchemy database models
│   └── __init__.py
│
├── schemas/          # Pydantic schemas
│   └── __init__.py
│
├── services/         # Business logic services
│   ├── email.py          # Email service (Mailtrap)
│   └── templates.py      # Email templates
│
├── tests/            # Test files
│   ├── test_auth_flow.py          # Authentication tests
│   ├── test_db_connection.py      # Database diagnostics
│   ├── test_member_management.py  # Member API tests
│   ├── test_relationships.py      # Relationship tests
│   ├── test_tree_management.py    # Tree API tests
│   └── test_tree_validation.py    # Validation tests
│
├── tools/            # Utility scripts
│   ├── check_schema.py            # Database schema checker
│   ├── create_test_db.py          # Test database setup
│   ├── create_twilio_api_key.py   # Twilio key management
│   ├── list_twilio_api_keys.py
│   ├── reset_alembic.py           # Alembic reset utility
│   └── revoke_twilio_api_key.py
│
├── utils/            # Utility modules
│   ├── auth.py           # JWT authentication utilities
│   ├── db.py             # Database connection (development)
│   ├── dependencies.py   # FastAPI dependencies
│   ├── rate_limit.py     # Rate limiting
│   ├── test_db.py        # Test database utilities
│   └── tree_validation.py # Tree settings validation
│
├── .env              # Environment variables (not in git)
├── .env.example      # Environment template
├── alembic.ini       # Alembic configuration
├── pyproject.toml    # Python project configuration
└── requirements.txt  # Python dependencies
```

## Running Tests

### Individual Tests

```bash
# Database connection test
python tests/test_db_connection.py

# Relationship management tests
python tests/test_relationships.py

# Tree validation tests (requires pytest)
pytest tests/test_tree_validation.py -v
```

### All Tests

```bash
# Run all tests with pytest
pytest tests/ -v

# Run specific test file
pytest tests/test_tree_validation.py -v
```

## Utility Scripts

### Database Tools

```bash
# Check database schema
python tools/check_schema.py

# Create test database
python tools/create_test_db.py

# Reset Alembic migrations
python tools/reset_alembic.py

# Test database connection
python tests/test_db_connection.py
```

### API Key Management

```bash
# Create Twilio API key
python tools/create_twilio_api_key.py

# List Twilio API keys
python tools/list_twilio_api_keys.py

# Revoke Twilio API key
python tools/revoke_twilio_api_key.py
```

## Development Workflow

### 1. Environment Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
```

### 2. Database Setup

```bash
# Run migrations
alembic upgrade head

# Create test database (optional)
python tools/create_test_db.py
```

### 3. Running the Server

```bash
# Development server with auto-reload
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# Production server
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### 4. Testing

```bash
# Run database tests
python tests/test_relationships.py

# Run all pytest tests
pytest tests/ -v
```

## Documentation

All documentation is in the `docs/` directory:

- **QUICKSTART.md** - Quick start guide
- **DATABASE_SETUP.md** - Database configuration
- **AUTHENTICATION.md** - Auth system documentation
- **MEMBER_MANAGEMENT.md** - Member API documentation
- **RELATIONSHIPS.md** - Relationship API documentation
- **TREE_SETTINGS_VALIDATION.md** - Validation system documentation
- **PHASE\_\*.md** - Phase-specific implementation summaries

## Import Guidelines

### From Test Files

Since test files are in the `tests/` directory, they need to add the parent directory to the Python path:

```python
import sys
import os

# Add parent directory to path to import backend modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Now you can import backend modules
from utils.test_db import test_engine
from models import User, Tree
```

### From API Files

API files can import directly since they're at the same level:

```python
from utils.auth import create_access_token
from models import User
from schemas import UserRead
```

### From Utility Scripts

Utility scripts in `tools/` also need path adjustments:

```python
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from utils.db import engine
```

## Database Configuration

### Development Database

- **Name**: `family_tree_dev`
- **URL**: Set in `.env` as `DATABASE_URL`
- **Used by**: API server, Alembic migrations

### Test Database

- **Name**: `family_tree_dev_test`
- **URL**: Automatically constructed by `utils/test_db.py`
- **Used by**: Test scripts
- **Created by**: `python tools/create_test_db.py`

## File Organization Principles

1. **API Endpoints** → `api/`
2. **Documentation** → `docs/`
3. **Tests** → `tests/`
4. **Utility Scripts** → `tools/`
5. **Shared Utilities** → `utils/`
6. **Database Models** → `models/`
7. **Pydantic Schemas** → `schemas/`
8. **Business Logic** → `services/`

## Recent Changes

## Notes

- **Test Database Safety**: All tests use a separate `family_tree_dev_test` database to prevent data loss
- **Path Management**: Python files outside the main package need explicit path manipulation
- **Alembic Configuration**: Handles URL-encoded passwords with proper escaping (% → %%)

---

_For detailed documentation on specific features, see the files in the `docs/` directory._
