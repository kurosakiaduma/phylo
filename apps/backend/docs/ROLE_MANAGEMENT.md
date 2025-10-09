# Role Management System

## Overview

The Role Management system provides fine-grained access control for family trees through a hierarchical role-based permission system. Each tree can have multiple members with different roles, and custodians can manage these roles dynamically.

## Role Hierarchy

The system implements three roles with hierarchical permissions:

```
custodian > contributor > viewer
```

### Role Definitions

| Role            | Level | Permissions                                                                       |
| --------------- | ----- | --------------------------------------------------------------------------------- |
| **Custodian**   | 3     | Full control: manage members, relationships, settings, invite users, manage roles |
| **Contributor** | 2     | Can view tree and propose changes (future feature)                                |
| **Viewer**      | 1     | Read-only access to tree data                                                     |

### Permission Rules

- **Hierarchical Access**: Higher roles inherit all permissions of lower roles
  - Custodians can do everything contributors and viewers can do
  - Contributors can do everything viewers can do
- **Custodian Protection**: Trees must always have at least one custodian
  - Cannot demote the last custodian
  - Cannot remove the last custodian
  - Must promote someone else first

## API Endpoints

### 1. List Tree Memberships

Get all members of a tree with their roles.

```http
GET /api/trees/{tree_id}/memberships
```

**Authorization**: Any member (viewer, contributor, or custodian)

**Response**:

```json
[
  {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_email": "alice@example.com",
    "user_display_name": "Alice Smith",
    "role": "custodian",
    "joined_at": "2025-01-15T10:30:00Z"
  },
  {
    "user_id": "987f6543-e21c-34d5-b678-123456789abc",
    "user_email": "bob@example.com",
    "user_display_name": "Bob Jones",
    "role": "contributor",
    "joined_at": "2025-01-20T14:45:00Z"
  }
]
```

### 2. Update Membership Role

Change a user's role in a tree.

```http
PATCH /api/memberships/{user_id}/{tree_id}
Content-Type: application/json
```

**Authorization**: Custodian only

**Request Body**:

```json
{
  "role": "custodian"
}
```

**Valid Roles**: `"custodian"`, `"contributor"`, `"viewer"`

**Response**:

```json
{
  "id": "456e7890-f12a-45b6-c789-012345678def",
  "user_id": "987f6543-e21c-34d5-b678-123456789abc",
  "tree_id": "321a9876-d54e-32f1-e098-765432109876",
  "role": "custodian",
  "joined_at": "2025-01-20T14:45:00Z"
}
```

**Error Responses**:

| Status | Error             | Description                                    |
| ------ | ----------------- | ---------------------------------------------- |
| 400    | Invalid role      | Role must be custodian, contributor, or viewer |
| 400    | Last custodian    | Cannot demote the only custodian               |
| 403    | Permission denied | Only custodians can update roles               |
| 404    | Not found         | User is not a member of this tree              |

### 3. Remove Membership

Remove a user from a tree entirely.

```http
DELETE /api/memberships/{user_id}/{tree_id}
```

**Authorization**: Custodian only

**Response**:

```json
{
  "status": "ok",
  "message": "Membership removed successfully"
}
```

**Error Responses**:

| Status | Error             | Description                        |
| ------ | ----------------- | ---------------------------------- |
| 400    | Last custodian    | Cannot remove the only custodian   |
| 403    | Permission denied | Only custodians can remove members |
| 404    | Not found         | User is not a member of this tree  |

## Permission Utilities

The system provides utility functions for checking permissions programmatically:

### `has_role(user_id, tree_id, required_role, db_session)`

Check if a user has at least the required role in a tree.

```python
from utils.permissions import has_role

# Check if user can contribute
if has_role(user.id, tree_id, "contributor", db):
    # User is contributor or custodian
    pass
```

**Parameters**:

- `user_id` (UUID): User to check
- `tree_id` (UUID): Tree to check
- `required_role` (str): Minimum role required
- `db_session` (Session): Database session

**Returns**: `bool` - True if user has sufficient role

### `is_custodian(user_id, tree_id, db_session)`

Check if a user is specifically a custodian.

```python
from utils.permissions import is_custodian

if is_custodian(user.id, tree_id, db):
    # User can manage tree settings
    pass
```

**Returns**: `bool` - True if user is custodian

### `is_contributor(user_id, tree_id, db_session)`

Check if a user is at least a contributor.

```python
from utils.permissions import is_contributor

if is_contributor(user.id, tree_id, db):
    # User can propose changes
    pass
```

**Returns**: `bool` - True if user is contributor or custodian

### `is_viewer(user_id, tree_id, db_session)`

Check if a user has any access to the tree.

```python
from utils.permissions import is_viewer

if is_viewer(user.id, tree_id, db):
    # User can view tree data
    pass
```

**Returns**: `bool` - True if user has any role

### `require_membership(user_id, tree_id, db_session, required_role=None)`

Require membership with optional role check. Raises HTTPException if denied.

```python
from utils.permissions import require_membership

# Require any membership
membership = require_membership(user.id, tree_id, db)

# Require custodian role
membership = require_membership(user.id, tree_id, db, "custodian")
```

**Raises**:

- `HTTPException 403`: Access denied
- `HTTPException 404`: Tree not found

### `count_custodians(tree_id, db_session)`

Count how many custodians a tree has.

```python
from utils.permissions import count_custodians

custodian_count = count_custodians(tree_id, db)
```

**Returns**: `int` - Number of custodians

### `validate_role_change(membership, new_role, db_session)`

Validate that a role change is allowed. Raises exception if invalid.

```python
from utils.permissions import validate_role_change

validate_role_change(membership, "viewer", db)
# Raises HTTPException 400 if invalid
```

## FastAPI Dependencies

The system provides ready-to-use FastAPI dependencies for endpoint authorization:

### `require_tree_role(required_role)`

Dependency that validates role from path parameters.

```python
from fastapi import Depends
from utils.dependencies import require_tree_role

@router.patch('/trees/{tree_id}')
def update_tree(
    tree_id: UUID,
    updates: TreeUpdate,
    user: models.User = Depends(require_tree_role("custodian"))
):
    # Only custodians reach here
    pass
```

### Shorthand Dependencies

```python
from utils.dependencies import require_custodian, require_contributor, require_viewer

# Custodian only
@router.delete('/trees/{tree_id}')
def delete_tree(
    tree_id: UUID,
    user: models.User = Depends(require_custodian())
):
    pass

# Contributor or higher
@router.post('/trees/{tree_id}/propose')
def propose_change(
    tree_id: UUID,
    user: models.User = Depends(require_contributor())
):
    pass

# Any member
@router.get('/trees/{tree_id}')
def get_tree(
    tree_id: UUID,
    user: models.User = Depends(require_viewer())
):
    pass
```

## Usage Examples

### Example 1: Promoting a Contributor to Custodian

```bash
# As custodian, promote Bob to custodian
curl -X PATCH "https://api.familytree.com/api/memberships/987f6543.../321a9876..." \
  -H "Authorization: Bearer <custodian_token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "custodian"}'
```

### Example 2: Safely Removing a Custodian

```bash
# Step 1: Promote someone else first
curl -X PATCH "https://api.familytree.com/api/memberships/bob_id/tree_id" \
  -H "Authorization: Bearer <token>" \
  -d '{"role": "custodian"}'

# Step 2: Now safe to demote or remove original custodian
curl -X DELETE "https://api.familytree.com/api/memberships/alice_id/tree_id" \
  -H "Authorization: Bearer <token>"
```

### Example 3: Using Permission Utilities in Code

```python
from fastapi import APIRouter, Depends, HTTPException
from utils.permissions import has_role, is_custodian
from utils.dependencies import get_current_user

router = APIRouter()

@router.post('/trees/{tree_id}/custom-action')
def custom_action(
    tree_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Custom logic: allow custodians OR contributors with special flag
    if is_custodian(current_user.id, tree_id, db):
        # Custodians can always proceed
        pass
    elif has_role(current_user.id, tree_id, "contributor", db):
        # Additional checks for contributors
        if not user_has_special_permission(current_user):
            raise HTTPException(403, "Contributors need special permission")
    else:
        raise HTTPException(403, "Insufficient permissions")

    # Proceed with action
    return {"status": "ok"}
```

## Common Workflows

### Workflow 1: Tree Creation

When a tree is created:

1. Creator is automatically assigned as custodian
2. Creator becomes the sole custodian
3. Creator can invite others with any role

### Workflow 2: Adding Members

Custodian workflow:

1. Send invite with desired role (custodian, contributor, or viewer)
2. User accepts invite
3. Membership created with specified role
4. User gains immediate access per their role

### Workflow 3: Role Escalation

Contributor to Custodian:

1. Existing custodian uses PATCH endpoint
2. System validates permissions
3. Role updated immediately
4. User gains custodian permissions

### Workflow 4: Role De-escalation

Custodian to Contributor:

1. Check custodian count first
2. If >1 custodian, proceed with PATCH
3. If only 1 custodian, must promote someone else first
4. System prevents removing last custodian

### Workflow 5: Removing Members

1. Custodian uses DELETE endpoint
2. System checks if removing custodian
3. If last custodian, request is denied
4. Otherwise, membership removed
5. User loses all access to tree

## Security Considerations

### 1. Authentication Required

All endpoints require valid JWT token:

```
Authorization: Bearer <jwt_token>
```

### 2. HTTPS Only in Production

All role management operations must use HTTPS to prevent token interception.

### 3. Audit Logging

All role changes are logged:

```
logger.info(
    f"Role change: {old_role} -> {new_role} "
    f"for user {user_id} by {current_user.email}"
)
```

### 4. Rate Limiting

Consider implementing rate limits on role update endpoints to prevent abuse.

### 5. Last Custodian Protection

The system enforces that trees must always have at least one custodian:

- Prevents orphaned trees
- Ensures accountability
- Maintains access control

## Error Handling

### Common Errors

| Error             | Status | Cause                                        | Solution                            |
| ----------------- | ------ | -------------------------------------------- | ----------------------------------- |
| Last custodian    | 400    | Trying to demote/remove only custodian       | Promote another member first        |
| Invalid role      | 400    | Role not in [custodian, contributor, viewer] | Use valid role name                 |
| Permission denied | 403    | Non-custodian trying to manage roles         | Request custodian to perform action |
| Not found         | 404    | User not member of tree                      | Send invite first                   |
| Unauthorized      | 401    | Missing or invalid JWT token                 | Login and retry with valid token    |

### Error Response Format

```json
{
  "detail": "Cannot remove the last custodian from the tree. Promote another member to custodian first."
}
```

## Testing

Run the role management tests:

```bash
cd apps/backend
pytest tests/test_role_management.py -v
```

Test coverage includes:

- ✅ List memberships as different roles
- ✅ Promote contributor to custodian
- ✅ Demote custodian to contributor
- ✅ Prevent removing last custodian
- ✅ Invalid role validation
- ✅ Permission checks (custodian-only)
- ✅ Remove members safely
- ✅ Utility function behavior

## Future Enhancements

### Planned Features

1. **Granular Permissions**: Custom permission sets per role
2. **Role History**: Track role changes over time
3. **Temporary Roles**: Time-limited custodian access
4. **Delegation**: Custodians delegate specific permissions
5. **Role Templates**: Predefined role configurations
6. **Approval Workflows**: Require multiple custodians for sensitive actions

### Migration Path

When adding new roles:

1. Add to `ROLE_HIERARCHY` in `permissions.py`
2. Update schema validation in `schemas.py`
3. Add tests for new role
4. Update documentation
5. Run database migration if needed

## Support

For issues or questions:

- Check test suite: `tests/test_role_management.py`
- Review permission utilities: `utils/permissions.py`
- Review dependencies: `utils/dependencies.py`
- Check API endpoints: `api/memberships.py`

## Summary

The Role Management system provides:

- ✅ Three-tier hierarchical roles (custodian > contributor > viewer)
- ✅ Custodian-only role management
- ✅ Last custodian protection
- ✅ Comprehensive permission utilities
- ✅ FastAPI dependencies for easy integration
- ✅ Full test coverage
- ✅ Audit logging
- ✅ RESTful API endpoints

Tree owners have full control over access levels while maintaining security through the custodian protection mechanism.
