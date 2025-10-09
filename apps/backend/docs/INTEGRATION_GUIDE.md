# Integration Guide: Adding Role Management to Existing Endpoints

## Overview

This guide shows how to integrate the new role management system into existing API endpoints.

## Quick Migration Checklist

For each endpoint that needs authorization:

1. ✅ Identify required role (custodian, contributor, or viewer)
2. ✅ Replace existing checks with new dependencies or utilities
3. ✅ Test the endpoint with different roles
4. ✅ Update endpoint documentation

## Pattern 1: Using FastAPI Dependencies (Recommended)

### Before (Manual Check)

```python
@router.patch('/trees/{tree_id}')
def update_tree(
    tree_id: UUID,
    updates: TreeUpdate,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(get_db)
):
    # Manual permission check
    membership = db_session.query(models.Membership).filter(
        models.Membership.user_id == current_user.id,
        models.Membership.tree_id == tree_id
    ).first()

    if not membership or membership.role != "custodian":
        raise HTTPException(403, "Requires custodian role")

    # Endpoint logic...
```

### After (Using Dependency)

```python
from utils.dependencies import require_custodian

@router.patch('/trees/{tree_id}')
def update_tree(
    tree_id: UUID,
    updates: TreeUpdate,
    current_user: models.User = Depends(require_custodian()),  # ✅ Simple!
    db_session: Session = Depends(get_db)
):
    # Endpoint logic...
    # No need for manual checks!
```

## Pattern 2: Using Permission Utilities

### When to Use

Use utilities when you need:

- Custom logic based on roles
- Multiple role checks in one endpoint
- Conditional behavior per role

### Example: Different Behavior per Role

```python
from utils.permissions import is_custodian, is_contributor

@router.get('/trees/{tree_id}/data')
def get_tree_data(
    tree_id: UUID,
    include_sensitive: bool = False,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(get_db)
):
    # Require membership (any role)
    from utils.permissions import require_membership
    require_membership(current_user.id, tree_id, db_session)

    # Get basic data
    data = get_basic_tree_data(tree_id, db_session)

    # Only custodians see sensitive info
    if include_sensitive and is_custodian(current_user.id, tree_id, db_session):
        data["sensitive_info"] = get_sensitive_data(tree_id, db_session)

    return data
```

## Pattern 3: Mixed Approach

### Example: Require Contributor, Check for Custodian

```python
from utils.dependencies import require_contributor
from utils.permissions import is_custodian

@router.post('/trees/{tree_id}/propose-change')
def propose_change(
    tree_id: UUID,
    change: ChangeProposal,
    current_user: models.User = Depends(require_contributor()),  # Contributor or higher
    db_session: Session = Depends(get_db)
):
    # Contributors can propose
    proposal = create_proposal(tree_id, change, current_user.id)

    # Custodians auto-approve
    if is_custodian(current_user.id, tree_id, db_session):
        approve_proposal(proposal.id, db_session)

    return proposal
```

## Migrating Existing Endpoints

### Step 1: Identify Endpoints to Migrate

```bash
# Find endpoints with manual permission checks
cd apps/backend
grep -r "Membership.role" api/*.py
grep -r "custodian" api/*.py
grep -r "contributor" api/*.py
```

### Step 2: Determine Required Role

| Action                | Required Role |
| --------------------- | ------------- |
| View tree/member data | viewer        |
| Propose changes       | contributor   |
| Modify tree settings  | custodian     |
| Manage members        | custodian     |
| Manage relationships  | custodian     |
| Invite users          | custodian     |
| Update roles          | custodian     |
| Delete tree           | custodian     |

### Step 3: Replace Permission Checks

#### Example 1: Trees Endpoint

**File**: `api/trees.py`

```python
# Before
def _check_tree_access(tree_id, user, db_session, required_role=None):
    # ... manual check ...
    membership = db_session.query(models.Membership).filter(...)
    if required_role and membership.role != required_role:
        raise HTTPException(403, "Insufficient permissions")
    return membership

# After
from utils.permissions import require_membership

def _check_tree_access(tree_id, user, db_session, required_role=None):
    return require_membership(user.id, tree_id, db_session, required_role)
```

#### Example 2: Members Endpoint

**File**: `api/members.py`

```python
# Before
@router.post('/trees/{tree_id}/members')
def create_member(
    tree_id: UUID,
    member_data: MemberCreate,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(get_db)
):
    # Manual check
    membership = db_session.query(models.Membership).filter(
        models.Membership.user_id == current_user.id,
        models.Membership.tree_id == tree_id
    ).first()

    if not membership or membership.role != "custodian":
        raise HTTPException(403, "Only custodians can add members")

    # Logic...

# After
from utils.dependencies import require_custodian

@router.post('/trees/{tree_id}/members')
def create_member(
    tree_id: UUID,
    member_data: MemberCreate,
    current_user: models.User = Depends(require_custodian()),  # ✅
    db_session: Session = Depends(get_db)
):
    # Logic...
    # Permission already checked!
```

#### Example 3: Relationships Endpoint

**File**: `api/relationships.py`

```python
# Before
@router.post('/members/{member_id}/spouse')
def add_spouse(
    member_id: UUID,
    spouse_data: MemberCreate,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(get_db)
):
    # Get member and check tree access
    member = db_session.query(models.Member).filter(
        models.Member.id == member_id
    ).first()

    if not member:
        raise HTTPException(404, "Member not found")

    # Check custodian
    membership = db_session.query(models.Membership).filter(
        models.Membership.user_id == current_user.id,
        models.Membership.tree_id == member.tree_id
    ).first()

    if not membership or membership.role != "custodian":
        raise HTTPException(403, "Only custodians can add relationships")

    # Logic...

# After
from utils.permissions import require_membership

@router.post('/members/{member_id}/spouse')
def add_spouse(
    member_id: UUID,
    spouse_data: MemberCreate,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(get_db)
):
    # Get member
    member = db_session.query(models.Member).filter(
        models.Member.id == member_id
    ).first()

    if not member:
        raise HTTPException(404, "Member not found")

    # Check custodian permission in one line
    require_membership(current_user.id, member.tree_id, db_session, "custodian")

    # Logic...
```

### Step 4: Test After Migration

```python
# Test with different roles
def test_endpoint_access():
    # Custodian: Should work
    response = client.post(
        f"/api/trees/{tree_id}/members",
        headers=get_auth_headers(custodian_user),
        json=member_data
    )
    assert response.status_code == 201

    # Contributor: Should fail
    response = client.post(
        f"/api/trees/{tree_id}/members",
        headers=get_auth_headers(contributor_user),
        json=member_data
    )
    assert response.status_code == 403

    # Non-member: Should fail
    response = client.post(
        f"/api/trees/{tree_id}/members",
        headers=get_auth_headers(non_member_user),
        json=member_data
    )
    assert response.status_code == 403
```

## Common Migration Scenarios

### Scenario 1: Read-Only Endpoint (Viewer+)

Any tree member should be able to access:

```python
from utils.dependencies import require_viewer

@router.get('/trees/{tree_id}')
def get_tree(
    tree_id: UUID,
    current_user: models.User = Depends(require_viewer())
):
    # Any member can view
    pass
```

### Scenario 2: Modification Endpoint (Custodian Only)

Only custodians should be able to modify:

```python
from utils.dependencies import require_custodian

@router.patch('/trees/{tree_id}')
def update_tree(
    tree_id: UUID,
    updates: TreeUpdate,
    current_user: models.User = Depends(require_custodian())
):
    # Only custodians can update
    pass
```

### Scenario 3: Propose Changes (Contributor+)

Contributors can propose, custodians can approve:

```python
from utils.dependencies import require_contributor
from utils.permissions import is_custodian

@router.post('/trees/{tree_id}/changes')
def create_change(
    tree_id: UUID,
    change: ChangeData,
    current_user: models.User = Depends(require_contributor()),
    db_session: Session = Depends(get_db)
):
    # Create proposal
    proposal = Proposal(tree_id=tree_id, data=change)

    # Auto-approve for custodians
    if is_custodian(current_user.id, tree_id, db_session):
        proposal.approved = True

    db_session.add(proposal)
    db_session.commit()
    return proposal
```

### Scenario 4: Multi-Level Access

Different data based on role:

```python
from utils.dependencies import require_viewer
from utils.permissions import is_custodian, is_contributor

@router.get('/trees/{tree_id}/statistics')
def get_statistics(
    tree_id: UUID,
    current_user: models.User = Depends(require_viewer()),
    db_session: Session = Depends(get_db)
):
    stats = {"member_count": get_member_count(tree_id, db_session)}

    # Contributors see more
    if is_contributor(current_user.id, tree_id, db_session):
        stats["recent_changes"] = get_recent_changes(tree_id, db_session)

    # Custodians see everything
    if is_custodian(current_user.id, tree_id, db_session):
        stats["pending_invites"] = get_pending_invites(tree_id, db_session)
        stats["user_activity"] = get_user_activity(tree_id, db_session)

    return stats
```

## Benefits of Migration

### Before Migration

- ❌ Inconsistent permission checking
- ❌ Duplicate code across endpoints
- ❌ Hard to maintain and test
- ❌ Easy to forget permission checks
- ❌ No centralized role hierarchy

### After Migration

- ✅ Consistent permission model
- ✅ DRY (Don't Repeat Yourself)
- ✅ Easy to maintain and test
- ✅ Hard to forget (dependency injection)
- ✅ Centralized role hierarchy
- ✅ Better error messages
- ✅ Audit logging included

## Testing Checklist

After migrating an endpoint:

- [ ] Test with custodian user (should work if custodian-only)
- [ ] Test with contributor user (should work if contributor+, fail if custodian-only)
- [ ] Test with viewer user (should work if viewer+, fail otherwise)
- [ ] Test with non-member (should always fail with 403)
- [ ] Test with invalid/expired token (should fail with 401)
- [ ] Verify error messages are clear
- [ ] Verify audit logs are created

## Documentation Updates

After migrating, update endpoint documentation:

```python
@router.patch('/trees/{tree_id}')
def update_tree(
    tree_id: UUID,
    updates: TreeUpdate,
    current_user: models.User = Depends(require_custodian()),
    db_session: Session = Depends(get_db)
):
    """Update tree metadata and settings.

    **Authorization**: Custodian only  # ✅ Add this

    Args:
        tree_id: UUID of the tree to update
        updates: Tree update data
        current_user: Current authenticated user (must be custodian)
        db_session: Database session

    Returns:
        Updated tree data

    Raises:
        HTTPException 403: User is not a custodian of this tree
        HTTPException 404: Tree not found
    """
    # Implementation...
```

## Gradual Migration Strategy

Don't need to migrate everything at once:

### Phase 1: High-Impact Endpoints

- Tree settings updates
- Member creation/deletion
- Relationship management
- Role updates (already done)

### Phase 2: Medium-Impact Endpoints

- Member updates
- Tree metadata updates
- Invite management

### Phase 3: Low-Impact Endpoints

- Read-only endpoints
- Statistics endpoints
- Search endpoints

## Rollback Plan

If issues arise, can easily rollback:

1. Keep old permission check code commented:

```python
# Old permission check (backup)
# membership = db_session.query(...)
# if not membership or membership.role != "custodian":
#     raise HTTPException(403, "Only custodians...")

# New permission check
current_user: models.User = Depends(require_custodian())
```

2. If needed, uncomment old code and remove dependency

## Summary

### Migration Steps

1. ✅ Identify required role for endpoint
2. ✅ Choose dependency or utility approach
3. ✅ Replace manual checks
4. ✅ Test with different roles
5. ✅ Update documentation
6. ✅ Deploy and monitor

### Key Dependencies

- `require_custodian()` - Custodian-only endpoints
- `require_contributor()` - Contributor+ endpoints
- `require_viewer()` - Any member endpoints
- `require_tree_role(role)` - Custom role requirement

### Key Utilities

- `is_custodian(user_id, tree_id, db)` - Check custodian
- `has_role(user_id, tree_id, role, db)` - Check minimum role
- `require_membership(user_id, tree_id, db, role)` - Enforce membership

### Result

- ✅ Cleaner code
- ✅ Consistent permissions
- ✅ Better maintainability
- ✅ Improved security

Ready to migrate! 🚀
