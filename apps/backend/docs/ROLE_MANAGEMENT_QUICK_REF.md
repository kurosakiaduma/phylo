# Role Management Quick Reference

## Quick Start

```python
# Check if user is custodian
from utils.permissions import is_custodian

if is_custodian(user.id, tree_id, db):
    # User can manage tree
    pass

# Require custodian for endpoint
from utils.dependencies import require_custodian

@router.delete('/trees/{tree_id}')
def delete_tree(
    tree_id: UUID,
    user: models.User = Depends(require_custodian())
):
    # Only custodians reach here
    pass
```

## Role Hierarchy

```
custodian (3) > contributor (2) > viewer (1)
```

## API Endpoints

| Method | Endpoint                               | Auth       | Purpose          |
| ------ | -------------------------------------- | ---------- | ---------------- |
| GET    | `/api/trees/{tree_id}/memberships`     | Any member | List all members |
| PATCH  | `/api/memberships/{user_id}/{tree_id}` | Custodian  | Update role      |
| DELETE | `/api/memberships/{user_id}/{tree_id}` | Custodian  | Remove member    |

## Permission Functions

```python
from utils.permissions import (
    has_role,           # Check if user has minimum role
    is_custodian,       # Check if user is custodian
    is_contributor,     # Check if user is contributor+
    is_viewer,          # Check if user has any access
    require_membership, # Require membership (raises exception)
    count_custodians,   # Count custodians in tree
    validate_role_change # Validate role change
)

# Examples
has_role(user_id, tree_id, "contributor", db)  # True if contributor or custodian
is_custodian(user_id, tree_id, db)             # True only if custodian
membership = require_membership(user_id, tree_id, db, "custodian")  # Raises 403 if not custodian
```

## FastAPI Dependencies

```python
from utils.dependencies import (
    require_tree_role,   # Flexible role requirement
    require_custodian,   # Custodian only
    require_contributor, # Contributor or higher
    require_viewer       # Any member
)

# Usage
@router.patch('/trees/{tree_id}')
def update(
    tree_id: UUID,
    user: models.User = Depends(require_custodian())
):
    pass
```

## Common Patterns

### Pattern 1: Custodian-Only Action

```python
@router.post('/trees/{tree_id}/sensitive-action')
def sensitive_action(
    tree_id: UUID,
    user: models.User = Depends(require_custodian())
):
    # Custodian-only logic
    pass
```

### Pattern 2: Manual Permission Check

```python
@router.get('/trees/{tree_id}/data')
def get_data(
    tree_id: UUID,
    include_private: bool = False,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Require membership
    membership = require_membership(user.id, tree_id, db)

    # Only custodians see private data
    if include_private and not is_custodian(user.id, tree_id, db):
        raise HTTPException(403, "Private data requires custodian role")

    return get_tree_data(tree_id, include_private)
```

### Pattern 3: Promote User to Custodian

```python
# Check custodian permission first
require_membership(current_user.id, tree_id, db, "custodian")

# Get membership to update
membership = get_membership(target_user_id, tree_id, db)

# Validate and update
validate_role_change(membership, "custodian", db)
membership.role = "custodian"
db.commit()
```

## Update Role (API)

```bash
curl -X PATCH "http://localhost:8000/api/memberships/{user_id}/{tree_id}" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "custodian"}'
```

## Important Rules

1. ⚠️ **Cannot remove last custodian** - Must promote someone else first
2. ✅ **Role hierarchy** - Higher roles inherit lower permissions
3. 🔒 **Custodian-only** - Only custodians can manage roles
4. ✅ **Multiple custodians** - Trees can have multiple custodians

## Error Codes

| Code | Meaning           | Fix                                    |
| ---- | ----------------- | -------------------------------------- |
| 400  | Last custodian    | Promote another user first             |
| 400  | Invalid role      | Use: custodian, contributor, or viewer |
| 403  | Permission denied | Request custodian to perform action    |
| 404  | Not found         | User not member of tree                |

## Testing

```bash
pytest tests/test_role_management.py -v
```

## Files

- `utils/permissions.py` - Permission utilities
- `utils/dependencies.py` - FastAPI dependencies
- `api/memberships.py` - Membership endpoints
- `tests/test_role_management.py` - Tests
- `docs/ROLE_MANAGEMENT.md` - Full documentation
