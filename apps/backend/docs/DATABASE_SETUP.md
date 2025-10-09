# Database Setup Summary

## Overview

We have successfully configured separate databases for development and testing to prevent test data from affecting the development database.

---

## Database Configuration

### Development Database
- **Name**: `family_tree_dev`
- **URL**: Set in `.env` file
- **Usage**: Used by the running server and development work
- **Tables**: Persistent, maintained by Alembic migrations

### Test Database  
- **Name**: `family_tree_dev_test`
- **URL**: Automatically derived from `DATABASE_URL` (appends `_test`)
- **Usage**: Used by unit/integration tests only
- **Tables**: Created and dropped by each test run

---

## Fixed Issues

### 1. URL Encoding in .env
**Problem**: Password with special characters was double-encoded (`%%21` instead of `%21`)

**Fix**: Changed `.env` to use single percent encoding:
```properties
# Before
DATABASE_URL=postgresql+psycopg://postgres:%%21%%40Octopizzo808%%40%%21@localhost:5432/family_tree_dev

# After
DATABASE_URL=postgresql+psycopg://postgres:%21%40Octopizzo808%40%21@localhost:5432/family_tree_dev
```

### 2. Alembic ConfigParser Issue
**Problem**: Alembic's `configparser` treats `%` as interpolation syntax

**Fix**: Updated `migrations/env.py` to double the percent signs when passing to Alembic:
```python
# Escape % signs for configparser (% -> %%) but keep the URL valid for SQLAlchemy
db_url_for_alembic = db_url.replace('%', '%%')
config.set_main_option('sqlalchemy.url', db_url_for_alembic)
```

### 3. Test Database Isolation
**Problem**: Tests were dropping all tables in the development database

**Solution**: Created separate test database infrastructure:
- `utils/test_db.py` - Test database utilities
- `create_test_db.py` - Script to create test database
- Updated `test_relationships.py` to use test database

---

## Files Created/Modified

### New Files
1. **`utils/test_db.py`** - Test database configuration and utilities
   - `test_engine` - SQLAlchemy engine for test database
   - `TestSessionLocal` - Session maker for test database
   - `create_test_db()` - Create all tables in test database
   - `drop_test_db()` - Drop all tables from test database
   - `get_test_db_info()` - Get test database connection info

2. **`create_test_db.py`** - Create test database if it doesn't exist
   - Connects to PostgreSQL
   - Creates `family_tree_dev_test` database
   - Handles existing database gracefully

3. **`reset_alembic.py`** - Reset alembic_version table
   - Useful for fixing broken migration state

4. **`check_schema.py`** - Verify database schema
   - Lists all tables
   - Shows columns, indexes, foreign keys
   - Displays row counts

5. **`test_db_connection.py`** - Diagnostic tool
   - Tests database connection
   - Shows URL encoding issues
   - Provides troubleshooting tips

### Modified Files
1. **`.env`** - Fixed password URL encoding (`%%21` → `%21`)

2. **`migrations/env.py`** - Fixed Alembic configparser issue
   - Added `db_url.replace('%', '%%')` for Alembic

3. **`test_relationships.py`** - Use test database
   - Import from `utils.test_db` instead of `utils.db`
   - Use `create_test_db()` and `drop_test_db()`
   - Display test database info

---

## Usage

### Initial Setup (One Time)

1. **Create test database**:
```bash
cd apps/backend
python create_test_db.py
```

2. **Apply migrations to development database**:
```bash
alembic upgrade head
```

3. **Verify schema**:
```bash
python check_schema.py
```

### Running Tests

Tests automatically create and drop their own tables:

```bash
# Test relationships (uses test database)
python test_relationships.py

# Test tree validation (mock-based, no database)
pytest test_tree_validation.py -v

# Test member management (requires running server)
python test_member_management.py

# Test auth flow (requires running server)
python test_auth_flow.py
```

### Development Workflow

1. **Start server** (uses dev database):
```bash
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

2. **Run tests** (uses test database):
```bash
python test_relationships.py
```

3. **Check database**:
```bash
# Development database
python check_schema.py

# Test connection
python test_db_connection.py
```

### Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Check current version
alembic current

# View history
alembic history

# Reset if needed (careful!)
python reset_alembic.py
alembic upgrade head
```

---

## Database Connection Details

### Connection String Format
```
postgresql+psycopg://user:password@host:port/database
```

### Password URL Encoding
Special characters must be URL-encoded:
- `!` → `%21`
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `^` → `%5E`
- `&` → `%26`
- `*` → `%2A`
- `(` → `%28`
- `)` → `%29`
- `+` → `%2B`
- `=` → `%3D`
- `[` → `%5B`
- `]` → `%5D`
- `{` → `%7B`
- `}` → `%7D`
- `|` → `%7C`
- `\` → `%5C`
- `:` → `%3A`
- `;` → `%3B`
- `"` → `%22`
- `'` → `%27`
- `<` → `%3C`
- `>` → `%3E`
- `,` → `%2C`
- `/` → `%2F`
- `?` → `%3F`
- `` ` `` → `%60`
- `~` → `%7E`

**Example**:
- Password: `!@Octopizzo808@!`
- Encoded: `%21%40Octopizzo808%40%21`

---

## Troubleshooting

### Connection Failed: Password Authentication Failed
**Cause**: Incorrect password or encoding issue

**Solutions**:
1. Check `.env` file has correct password
2. Verify URL encoding (single `%`, not double `%%`)
3. Test connection: `python test_db_connection.py`
4. Try manual connection: `psql -U postgres -d family_tree_dev`

### Alembic: Invalid Interpolation Syntax
**Cause**: ConfigParser treating `%` as interpolation

**Solution**: Fixed in `migrations/env.py` with `.replace('%', '%%')`

### Tables Not Created After Migration
**Cause**: alembic_version table had wrong state

**Solutions**:
1. Reset: `python reset_alembic.py`
2. Upgrade: `alembic upgrade head`
3. Verify: `python check_schema.py`

### Tests Dropping Development Tables
**Cause**: Tests using wrong database

**Solution**: Use `utils.test_db` in test files (already fixed for `test_relationships.py`)

---

## Security Notes

1. **Never commit `.env` file** - Contains sensitive passwords
2. **Use strong passwords** - Include special characters
3. **URL-encode passwords** - Required for special characters in connection strings
4. **Separate test database** - Prevents test data mixing with real data
5. **Test database password** - Same as dev database for convenience (OK for local dev)

---

## Next Steps

1. ✅ Development database ready
2. ✅ Test database ready
3. ✅ Alembic migrations working
4. ✅ Connection issues resolved
5. ✅ Test isolation implemented

**Ready for**:
- Running backend server
- Executing tests safely
- Developing new features
- Phase 2.8: Invitation System

---

*Last Updated: October 1, 2025*
