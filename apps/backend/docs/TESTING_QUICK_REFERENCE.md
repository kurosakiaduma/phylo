# Testing Quick Reference Guide

## Running Tests

### Run All Tests

```bash
# Using Fish shell (recommended)
./run_all_tests.fish

# Using Bash
./run_all_tests.sh

# Using pytest directly
pytest tests/ -v
```

### Run Specific Test Files

```bash
# Auth tests
pytest tests/test_auth_utilities.py -v
pytest tests/test_auth_integration.py -v

# Tree tests
pytest tests/test_tree_management.py -v
pytest tests/test_tree_validation.py -v

# Member tests
pytest tests/test_member_management.py -v

# Relationship tests
pytest tests/test_relationships.py -v

# Invitation tests
pytest tests/test_invites.py -v

# Role management tests
pytest tests/test_role_management.py -v
```

### Run Specific Test Classes

```bash
# Example: Run only JWT token creation tests
pytest tests/test_auth_utilities.py::TestJWTTokenCreation -v

# Example: Run only OTP request tests
pytest tests/test_auth_integration.py::TestOTPRequest -v
```

### Run Specific Tests

```bash
# Example: Run single test
pytest tests/test_auth_utilities.py::TestJWTTokenCreation::test_create_access_token_basic -v
```

### Run with Coverage

```bash
# HTML coverage report
pytest tests/ --cov --cov-report=html

# Terminal coverage report
pytest tests/ --cov --cov-report=term-missing

# JSON coverage report
pytest tests/ --cov --cov-report=json

# All formats
pytest tests/ --cov --cov-report=html --cov-report=term-missing --cov-report=json
```

### Run Tests by Pattern

```bash
# All auth tests
pytest tests/test_auth* -v

# All tests with "create" in name
pytest tests/ -k "create" -v

# All tests with "update" or "delete" in name
pytest tests/ -k "update or delete" -v

# Exclude specific tests
pytest tests/ -k "not slow" -v
```

---

## Test Organization

### Test Files (8 files, 3,710 lines)

```
tests/
├── test_auth_utilities.py       (430 lines, 23 tests)  Unit tests
├── test_auth_integration.py     (580 lines, 25 tests)  Integration
├── test_tree_management.py      (450 lines, 12 tests)  Integration
├── test_tree_validation.py      (350 lines, 8 tests)   Integration
├── test_member_management.py    (400 lines, 10 tests)  Integration
├── test_relationships.py        (380 lines, 8 tests)   Integration
├── test_invites.py              (650 lines, 13 tests)  Integration
└── test_role_management.py      (470 lines, 13 tests)  Integration
```

### Test Categories

**Unit Tests (23 tests)**

- JWT token creation
- Token verification
- Token security
- Edge cases

**Integration Tests (89 tests)**

- Authentication (25 tests)
- Tree management (12 tests)
- Tree validation (8 tests)
- Member management (10 tests)
- Relationships (8 tests)
- Invitations (13 tests)
- Role management (13 tests)

---

## Test Infrastructure

### Test Database

Tests use **SQLite in-memory database** for isolation:

```python
# Each test gets fresh database
@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### Test Client

Uses **FastAPI TestClient** for HTTP requests:

```python
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)
response = client.get("/api/trees")
```

### Mocking

External services are mocked:

```python
# Mock email service
@patch('services.email.send_email')
def test_something(mock_email):
    mock_email.return_value = None
    # Test code here

# Mock rate limiting
@patch('utils.rate_limit.check_rate_limit')
def test_something(mock_rate_limit):
    mock_rate_limit.return_value = None
    # Test code here
```

---

## Coverage Reports

### View HTML Coverage

```bash
# Generate and open HTML report
pytest tests/ --cov --cov-report=html
xdg-open htmlcov/index.html  # Linux
open htmlcov/index.html      # macOS
```

### Coverage Thresholds

Current coverage: **92%**

Target coverage by module:

- API endpoints: 90%+
- Utilities: 95%+
- Services: 85%+
- Overall: 90%+

### Coverage Command

```bash
# Full coverage with all reports
pytest tests/ \
  --cov=. \
  --cov-report=html:test-reports/coverage-html \
  --cov-report=term-missing \
  --cov-report=json:test-reports/coverage.json \
  --junit-xml=test-reports/junit.xml
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov httpx

      - name: Run tests
        run: pytest tests/ -v --cov --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
```

---

## Test Writing Guidelines

### Test Structure (Arrange-Act-Assert)

```python
def test_example():
    # Arrange - Set up test data
    user = create_user(email="test@example.com")
    tree = create_tree(user_id=user.id)

    # Act - Perform the action
    response = client.get(f"/api/trees/{tree.id}")

    # Assert - Verify the results
    assert response.status_code == 200
    assert response.json()["id"] == str(tree.id)
```

### Naming Conventions

```python
# Test file names
test_<module_name>.py

# Test class names (optional)
class Test<Feature>:
    pass

# Test function names
def test_<action>_<condition>_<expected_result>():
    pass

# Examples
def test_create_tree_success():
    pass

def test_update_member_unauthorized():
    pass

def test_delete_tree_not_found():
    pass
```

### Fixtures

```python
@pytest.fixture
def db_session():
    """Provide database session for tests"""
    # Setup
    yield session
    # Teardown

@pytest.fixture
def test_user(db_session):
    """Create test user"""
    user = User(email="test@example.com")
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def auth_headers(test_user):
    """Provide authentication headers"""
    token = create_access_token(user_id=test_user.id)
    return {"Authorization": f"Bearer {token}"}
```

### Parametrized Tests

```python
@pytest.mark.parametrize("role,expected", [
    ("custodian", 200),
    ("contributor", 403),
    ("viewer", 403),
])
def test_endpoint_authorization(role, expected):
    response = client.post("/api/...", headers=get_auth(role))
    assert response.status_code == expected
```

---

## Common Test Patterns

### Test Authentication

```python
def test_requires_authentication():
    # No auth header
    response = client.get("/api/trees")
    assert response.status_code == 401

def test_with_authentication():
    # With auth header
    token = create_access_token(user_id=user.id)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/trees", headers=headers)
    assert response.status_code == 200
```

### Test Authorization

```python
def test_custodian_only():
    # Custodian can access
    token = create_token_for_role("custodian")
    response = client.patch("/api/trees/123", headers=auth(token))
    assert response.status_code == 200

    # Contributor cannot access
    token = create_token_for_role("contributor")
    response = client.patch("/api/trees/123", headers=auth(token))
    assert response.status_code == 403
```

### Test Validation

```python
def test_invalid_input():
    data = {"name": ""}  # Invalid: empty name
    response = client.post("/api/trees", json=data)
    assert response.status_code == 422
    assert "name" in response.json()["detail"][0]["loc"]

def test_valid_input():
    data = {"name": "My Family Tree"}
    response = client.post("/api/trees", json=data)
    assert response.status_code == 201
```

### Test Database State

```python
def test_creates_record(db_session):
    initial_count = db_session.query(Tree).count()

    response = client.post("/api/trees", json={"name": "Test"})

    final_count = db_session.query(Tree).count()
    assert final_count == initial_count + 1
```

### Test Error Handling

```python
def test_not_found():
    response = client.get("/api/trees/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_conflict():
    # Create tree
    client.post("/api/trees", json={"name": "Tree1"})

    # Try to create duplicate (if unique constraint exists)
    response = client.post("/api/trees", json={"name": "Tree1"})
    assert response.status_code == 409
```

---

## Debugging Tests

### Run with Verbose Output

```bash
pytest tests/ -vv  # Extra verbose
```

### Show Print Statements

```bash
pytest tests/ -s  # Show stdout
```

### Stop on First Failure

```bash
pytest tests/ -x  # Stop after first failure
```

### Show Full Traceback

```bash
pytest tests/ --tb=long  # Detailed traceback
```

### Run Failed Tests Only

```bash
pytest tests/ --lf  # Last failed
pytest tests/ --ff  # Failed first, then others
```

### Interactive Debugging

```python
def test_something():
    # Add breakpoint
    import pdb; pdb.set_trace()

    # Or use pytest's breakpoint
    breakpoint()

    # Test code here
```

Then run with:

```bash
pytest tests/ -s  # Must use -s to enable pdb
```

---

## Performance Testing

### Measure Test Duration

```bash
# Show slowest tests
pytest tests/ --durations=10

# Show all test durations
pytest tests/ --durations=0
```

### Mark Slow Tests

```python
import pytest

@pytest.mark.slow
def test_something_slow():
    # Time-consuming test
    pass
```

Run without slow tests:

```bash
pytest tests/ -m "not slow"
```

---

## Test Output Examples

### Successful Run

```
============================= test session starts ==============================
collected 112 items

tests/test_auth_utilities.py::TestJWTTokenCreation::test_create_access_token_basic PASSED [  1%]
tests/test_auth_utilities.py::TestJWTTokenCreation::test_create_access_token_with_custom_expiry PASSED [  2%]
...
tests/test_role_management.py::TestPermissionUtilities::test_count_custodians_function PASSED [100%]

============================== 112 passed in 45.23s ===============================
```

### Failed Test

```
FAILED tests/test_auth.py::test_login - AssertionError: assert 401 == 200
```

### Coverage Summary

```
Name                              Stmts   Miss  Cover
-----------------------------------------------------
api/auth.py                         156     12    92%
api/trees.py                        245     18    93%
utils/permissions.py                178     15    92%
-----------------------------------------------------
TOTAL                              1729    136    92%
```

---

## Troubleshooting

### Import Errors

```bash
# Make sure you're in the backend directory
cd apps/backend

# Install test dependencies
pip install pytest pytest-cov httpx

# Run from correct directory
pytest tests/ -v
```

### Database Issues

```python
# Tests use SQLite in-memory, not PostgreSQL
# Check fixtures are properly set up

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    # ...
```

### Mock Not Working

```python
# Make sure mock path is correct
# Use full module path

# Wrong
@patch('send_email')

# Right
@patch('services.email.send_email')
```

### Token Issues

```python
# Check JWT secret matches
JWT_SECRET = "test-secret-key"

# Create valid token
from utils.auth import create_access_token
token = create_access_token(user_id=user.id)
```

---

## Resources

### Documentation

- pytest docs: https://docs.pytest.org/
- FastAPI testing: https://fastapi.tiangolo.com/tutorial/testing/
- Coverage.py: https://coverage.readthedocs.io/

### Project Files

- Test files: `tests/`
- Test runner: `run_all_tests.fish` or `run_all_tests.sh`
- Coverage reports: `test-reports/coverage-html/`

### Commands Cheat Sheet

```bash
# Run all tests
pytest tests/ -v

# With coverage
pytest tests/ --cov --cov-report=html

# Specific file
pytest tests/test_auth_utilities.py -v

# Stop on first failure
pytest tests/ -x

# Show print output
pytest tests/ -s

# Verbose
pytest tests/ -vv
```

---

**Happy Testing! 🧪✅**
