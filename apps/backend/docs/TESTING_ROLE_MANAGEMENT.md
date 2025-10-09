# Testing Role Management (Phase 2.9)

## Quick Test Guide

### Prerequisites

```bash
cd apps/backend
source .venv/bin/activate  # or: . .venv/bin/activate
```

### Run Tests

```bash
# Run all role management tests
pytest tests/test_role_management.py -v

# Run specific test class
pytest tests/test_role_management.py::TestUpdateMembershipRole -v

# Run specific test
pytest tests/test_role_management.py::TestUpdateMembershipRole::test_promote_contributor_to_custodian -v

# Run with output
pytest tests/test_role_management.py -v -s
```

### Manual API Testing

#### 1. Start the Backend

```bash
cd apps/backend
uvicorn api.main:app --reload --port 8000
```

#### 2. Get Authentication Token

First, authenticate to get a JWT token:

```bash
# Request OTP
curl -X POST "http://localhost:8000/api/auth/otp/request" \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'

# Verify OTP (check your email for code)
curl -X POST "http://localhost:8000/api/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com", "code": "123456"}'
```

Save the token from the response.

#### 3. Create a Tree (if needed)

```bash
curl -X POST "http://localhost:8000/api/trees" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Family Tree",
    "description": "Testing role management",
    "settings": {
      "allow_same_sex": true,
      "monogamy": true,
      "allow_polygamy": false,
      "allow_single_parent": true,
      "allow_multi_parent_children": false,
      "max_parents_per_child": 2
    }
  }'
```

Save the tree ID from the response.

#### 4. Invite a Member

```bash
curl -X POST "http://localhost:8000/api/invites" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tree_id": "YOUR_TREE_ID",
    "email": "contributor@example.com",
    "role": "contributor"
  }'
```

Have the invited user accept the invitation.

#### 5. List Memberships

```bash
curl -X GET "http://localhost:8000/api/trees/YOUR_TREE_ID/memberships" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:

```json
[
  {
    "user_id": "...",
    "user_email": "your-email@example.com",
    "user_display_name": "Your Name",
    "role": "custodian",
    "joined_at": "2025-10-01T10:00:00Z"
  },
  {
    "user_id": "...",
    "user_email": "contributor@example.com",
    "user_display_name": "Contributor Name",
    "role": "contributor",
    "joined_at": "2025-10-01T10:05:00Z"
  }
]
```

#### 6. Update Role (Promote to Custodian)

```bash
curl -X PATCH "http://localhost:8000/api/memberships/CONTRIBUTOR_USER_ID/YOUR_TREE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "custodian"}'
```

Expected response:

```json
{
  "id": "...",
  "user_id": "CONTRIBUTOR_USER_ID",
  "tree_id": "YOUR_TREE_ID",
  "role": "custodian",
  "joined_at": "2025-10-01T10:05:00Z"
}
```

#### 7. Try to Demote Last Custodian (Should Fail)

If you only have one custodian:

```bash
curl -X PATCH "http://localhost:8000/api/memberships/YOUR_USER_ID/YOUR_TREE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "viewer"}'
```

Expected response (HTTP 400):

```json
{
  "detail": "Cannot remove the last custodian from the tree. Promote another member to custodian first."
}
```

#### 8. Remove Member

```bash
curl -X DELETE "http://localhost:8000/api/memberships/CONTRIBUTOR_USER_ID/YOUR_TREE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:

```json
{
  "status": "ok",
  "message": "Membership removed successfully"
}
```

### Testing Permission Utilities

Create a Python script to test utilities directly:

```python
# test_permissions_manual.py
from utils.permissions import (
    has_role,
    is_custodian,
    is_contributor,
    is_viewer,
    count_custodians
)
from utils.db import get_db
from uuid import UUID

# Get database session
db = next(get_db())

# Replace with real IDs
user_id = UUID("YOUR_USER_ID")
tree_id = UUID("YOUR_TREE_ID")

# Test permission checks
print("Is custodian?", is_custodian(user_id, tree_id, db))
print("Is contributor?", is_contributor(user_id, tree_id, db))
print("Is viewer?", is_viewer(user_id, tree_id, db))

print("Has custodian role?", has_role(user_id, tree_id, "custodian", db))
print("Has contributor role?", has_role(user_id, tree_id, "contributor", db))
print("Has viewer role?", has_role(user_id, tree_id, "viewer", db))

print("Custodian count:", count_custodians(tree_id, db))
```

Run it:

```bash
cd apps/backend
python test_permissions_manual.py
```

### Testing FastAPI Dependencies

Create an endpoint that uses the dependencies:

```python
# In api/examples.py or similar
from fastapi import APIRouter, Depends
from utils.dependencies import require_custodian, require_contributor, require_viewer
import models

router = APIRouter(tags=["Examples"])

@router.get('/test/custodian-only/{tree_id}')
def test_custodian_only(
    tree_id: UUID,
    user: models.User = Depends(require_custodian())
):
    return {"message": f"Hello custodian {user.email}!"}

@router.get('/test/contributor-or-higher/{tree_id}')
def test_contributor_or_higher(
    tree_id: UUID,
    user: models.User = Depends(require_contributor())
):
    return {"message": f"Hello contributor {user.email}!"}

@router.get('/test/any-member/{tree_id}')
def test_any_member(
    tree_id: UUID,
    user: models.User = Depends(require_viewer())
):
    return {"message": f"Hello member {user.email}!"}
```

Test them:

```bash
# As custodian - all should work
curl -H "Authorization: Bearer TOKEN" "http://localhost:8000/test/custodian-only/TREE_ID"
curl -H "Authorization: Bearer TOKEN" "http://localhost:8000/test/contributor-or-higher/TREE_ID"
curl -H "Authorization: Bearer TOKEN" "http://localhost:8000/test/any-member/TREE_ID"

# As contributor - custodian-only should fail
curl -H "Authorization: Bearer CONTRIBUTOR_TOKEN" "http://localhost:8000/test/custodian-only/TREE_ID"  # 403
curl -H "Authorization: Bearer CONTRIBUTOR_TOKEN" "http://localhost:8000/test/contributor-or-higher/TREE_ID"  # OK
curl -H "Authorization: Bearer CONTRIBUTOR_TOKEN" "http://localhost:8000/test/any-member/TREE_ID"  # OK
```

## Test Scenarios Covered

### Automated Tests (pytest)

1. ✅ List memberships as custodian
2. ✅ List memberships as contributor
3. ✅ List memberships denied for non-members
4. ✅ Promote contributor to custodian
5. ✅ Demote custodian to contributor (multiple custodians)
6. ✅ Prevent demoting last custodian
7. ✅ Reject invalid roles
8. ✅ Deny non-custodians from updating roles
9. ✅ Handle nonexistent memberships
10. ✅ Remove contributor successfully
11. ✅ Prevent removing last custodian
12. ✅ Remove custodian when multiple exist
13. ✅ Deny non-custodians from removing members

### Manual Tests (API)

1. ✅ List all tree members
2. ✅ Promote user to higher role
3. ✅ Demote user to lower role
4. ✅ Try to demote last custodian (should fail)
5. ✅ Remove member from tree
6. ✅ Test permission utilities directly
7. ✅ Test FastAPI dependencies

## Troubleshooting

### Test Database Issues

If tests fail with database errors:

```bash
# Remove test database
rm tests/test_role_management.db

# Run tests again
pytest tests/test_role_management.py -v
```

### Import Errors

If you get import errors:

```bash
# Make sure you're in backend directory
cd apps/backend

# Make sure virtual environment is activated
source .venv/bin/activate  # Linux/Mac
# or
.venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
pip install pytest httpx
```

### Permission Denied Errors (403)

If you get 403 errors in manual testing:

1. Check that you're using a valid JWT token
2. Verify the user is a member of the tree
3. Verify the user has the required role
4. Check token hasn't expired (tokens expire after 24 hours)

### Database Connection Errors

If you get database connection errors:

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Start if needed
docker-compose up -d postgres

# Check connection
psql -h localhost -U family_tree_user -d family_tree_db
```

## Success Criteria

✅ All automated tests pass  
✅ Can list tree memberships  
✅ Can promote users to custodian  
✅ Can demote custodians (when multiple exist)  
✅ Cannot demote last custodian  
✅ Can remove members from tree  
✅ Cannot remove last custodian  
✅ Permission utilities work correctly  
✅ FastAPI dependencies enforce roles

## Next Steps

After testing Phase 2.9:

1. ✅ Mark tasks as complete in `family_tree_tasks.md`
2. ✅ Review documentation in `docs/ROLE_MANAGEMENT.md`
3. ✅ Integrate role checks into existing endpoints
4. 🚀 Proceed to Phase 3: Frontend Development

## Documentation References

- Full Documentation: `docs/ROLE_MANAGEMENT.md`
- Quick Reference: `docs/ROLE_MANAGEMENT_QUICK_REF.md`
- Implementation Summary: `docs/PHASE_2.9_SUMMARY.md`
- Test File: `tests/test_role_management.py`
- Permission Utilities: `utils/permissions.py`
- API Endpoints: `api/memberships.py`
- FastAPI Dependencies: `utils/dependencies.py`
