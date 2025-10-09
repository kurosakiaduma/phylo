# Role Management System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Role Management System                         │
│                        Phase 2.9                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Role Hierarchy

```
        ┌─────────────┐
        │  Custodian  │  Level 3
        │   (Owner)   │
        └──────┬──────┘
               │ inherits all below
               ↓
        ┌─────────────┐
        │ Contributor │  Level 2
        │  (Editor)   │
        └──────┬──────┘
               │ inherits all below
               ↓
        ┌─────────────┐
        │   Viewer    │  Level 1
        │  (Reader)   │
        └─────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FastAPI Application                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │ API Endpoints │─────▶│ Dependencies │─────▶│  Permissions │ │
│  │  (3 routes)   │      │  (4 helpers) │      │ (10 utilities)│ │
│  └───────────────┘      └──────────────┘      └──────┬───────┘ │
│         │                                              │         │
│         │                                              │         │
│         └──────────────────┬───────────────────────────┘         │
│                            ↓                                     │
│                   ┌─────────────────┐                           │
│                   │    Database     │                           │
│                   │  (memberships)  │                           │
│                   └─────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. List Memberships

```
   User Request
        ↓
   GET /api/trees/{tree_id}/memberships
        ↓
   [Authentication] ←── JWT Token
        ↓
   [Authorization] ←── require_viewer()
        ↓
   [Query Database]
        ↓
   [Return Members List]
        ↓
   Response 200 OK
```

### 2. Update Role

```
   User Request
        ↓
   PATCH /api/memberships/{user_id}/{tree_id}
        ↓
   [Authentication] ←── JWT Token
        ↓
   [Authorization] ←── require_custodian()
        ↓
   [Validate Role Change] ←── validate_role_change()
        │
        ├── Valid → [Update Database]
        │              ↓
        │         [Log Change]
        │              ↓
        │         Response 200 OK
        │
        └── Invalid → Response 400 Bad Request
                     (e.g., last custodian)
```

### 3. Remove Member

```
   User Request
        ↓
   DELETE /api/memberships/{user_id}/{tree_id}
        ↓
   [Authentication] ←── JWT Token
        ↓
   [Authorization] ←── require_custodian()
        ↓
   [Check Custodian Count]
        │
        ├── Multiple Custodians → [Delete Membership]
        │                              ↓
        │                         [Log Removal]
        │                              ↓
        │                         Response 200 OK
        │
        └── Last Custodian → Response 400 Bad Request
```

## Permission Check Flow

```
┌──────────────────┐
│ Endpoint Called  │
└────────┬─────────┘
         │
         ↓
┌────────────────────┐
│ Dependency Injected│  (e.g., require_custodian())
└────────┬───────────┘
         │
         ↓
┌────────────────────┐
│ require_membership │  (utils/permissions.py)
└────────┬───────────┘
         │
         ├─── Check tree exists?
         │         │
         │         ├── No → 404 Not Found
         │         └── Yes → Continue
         │
         ├─── Check user membership?
         │         │
         │         ├── No → 403 Forbidden
         │         └── Yes → Continue
         │
         └─── Check role sufficient?
                   │
                   ├── No → 403 Forbidden
                   └── Yes → ✅ Allow Access
```

## Database Schema

```
┌─────────────────────────────────────────────┐
│              memberships table              │
├─────────────┬───────────────────────────────┤
│ id          │ UUID (PK)                     │
│ user_id     │ UUID (FK → users.id)         │
│ tree_id     │ UUID (FK → trees.id)         │
│ role        │ VARCHAR (custodian/contrib..)│
│ joined_at   │ TIMESTAMP                     │
└─────────────┴───────────────────────────────┘
         ↑                    ↑
         │                    │
         │                    │
┌────────┴─────┐    ┌────────┴──────┐
│    users     │    │     trees     │
├──────────────┤    ├───────────────┤
│ id           │    │ id            │
│ email        │    │ name          │
│ display_name │    │ description   │
└──────────────┘    │ settings_json │
                    │ created_by    │
                    └───────────────┘
```

## Module Dependencies

```
┌─────────────────┐
│   api/main.py   │  (FastAPI app)
└────────┬────────┘
         │
         ├──▶ api/memberships.py
         │         │
         │         ├──▶ utils/dependencies.py
         │         │         │
         │         │         └──▶ utils/permissions.py
         │         │                      │
         │         │                      └──▶ models.py
         │         │
         │         └──▶ schemas.py
         │
         └──▶ (other routers...)
```

## Error Handling Flow

```
┌────────────────┐
│  Request Made  │
└───────┬────────┘
        │
        ↓
┌────────────────────────┐
│  Permission Denied?    │
└────────┬───────────────┘
         │
         ├── Yes → 403 Forbidden
         │         └─ "Requires custodian role"
         │
         ├── Not Found? → 404 Not Found
         │         └─ "Tree not found"
         │
         ├── Invalid Role? → 400 Bad Request
         │         └─ "Invalid role"
         │
         ├── Last Custodian? → 400 Bad Request
         │         └─ "Cannot remove last custodian"
         │
         └── Success → 200 OK
                 └─ Return data
```

## Use Case Examples

### Use Case 1: Tree Creation

```
1. User creates tree
        ↓
2. System creates tree record
        ↓
3. System auto-creates membership
        ↓
   role = "custodian"  ←── Creator is custodian
        ↓
4. User now has full control
```

### Use Case 2: Promoting a User

```
1. Custodian sends request
        ↓
2. System validates:
   - Requestor is custodian? ✓
   - Target user is member? ✓
   - New role is valid? ✓
        ↓
3. System updates role
        ↓
4. Target user gains new permissions
```

### Use Case 3: Safe Custodian Removal

```
1. Check custodian count
        ↓
   Count = 1?
        ├── Yes → ❌ BLOCK
        │         "Promote someone first"
        │
        └── No (2+) → ✓ ALLOW
                      ↓
                 2. Remove membership
                      ↓
                 3. Tree still has custodian(s)
```

## Testing Strategy

```
┌───────────────────────────────────────────┐
│          Test Coverage                     │
├───────────────────────────────────────────┤
│                                            │
│  Unit Tests (utilities)                   │
│  ├─ has_role()                            │
│  ├─ is_custodian()                        │
│  ├─ count_custodians()                    │
│  └─ validate_role_change()                │
│                                            │
│  Integration Tests (API)                  │
│  ├─ List memberships                      │
│  ├─ Update role                           │
│  ├─ Remove member                         │
│  ├─ Permission denials                    │
│  └─ Edge cases                            │
│                                            │
│  Edge Cases                               │
│  ├─ Last custodian protection             │
│  ├─ Invalid roles                         │
│  ├─ Non-existent memberships              │
│  └─ Unauthorized access                   │
│                                            │
└───────────────────────────────────────────┘
```

## Security Model

```
┌─────────────────────────────────────────────┐
│           Security Layers                    │
├─────────────────────────────────────────────┤
│                                              │
│  Layer 1: Authentication (JWT)              │
│  └─ Must be logged in                       │
│                                              │
│  Layer 2: Membership Check                  │
│  └─ Must be member of tree                  │
│                                              │
│  Layer 3: Role Validation                   │
│  └─ Must have sufficient role               │
│                                              │
│  Layer 4: Business Logic                    │
│  └─ Last custodian protection               │
│     └─ Role value validation                │
│                                              │
└─────────────────────────────────────────────┘
```

## Audit Trail

```
Every role change is logged:

┌────────────────────────────────────────────────┐
│ INFO: Custodian alice@example.com attempting  │
│       to update role for user bob_id in       │
│       tree tree_id                            │
├────────────────────────────────────────────────┤
│ INFO: Role change validated: membership       │
│       mem_id from contributor to custodian    │
├────────────────────────────────────────────────┤
│ INFO: Successfully updated membership mem_id: │
│       contributor -> custodian by             │
│       alice@example.com                       │
└────────────────────────────────────────────────┘
```

## Performance Considerations

```
┌────────────────────────────────────────┐
│       Database Optimization             │
├────────────────────────────────────────┤
│                                         │
│  Indexes Used:                          │
│  ├─ (user_id, tree_id) UNIQUE         │
│  ├─ user_id                            │
│  └─ tree_id                            │
│                                         │
│  Query Performance:                     │
│  ├─ Membership lookup: O(1) - indexed │
│  ├─ Count custodians: O(1) - indexed  │
│  └─ List memberships: O(n) - small n  │
│                                         │
└────────────────────────────────────────┘
```

## Future Enhancements

```
┌─────────────────────────────────────────┐
│         Roadmap                          │
├─────────────────────────────────────────┤
│                                          │
│  Phase 3: Frontend                       │
│  ├─ Role management UI                  │
│  ├─ Member list with roles              │
│  └─ Promote/demote controls             │
│                                          │
│  Future: Advanced Features               │
│  ├─ Custom permissions                  │
│  ├─ Role templates                      │
│  ├─ Temporary roles                     │
│  ├─ Delegation system                   │
│  └─ Approval workflows                  │
│                                          │
└─────────────────────────────────────────┘
```

## Summary

```
┌─────────────────────────────────────────────────┐
│         Phase 2.9: Role Management              │
│              ✅ COMPLETE                        │
├─────────────────────────────────────────────────┤
│                                                  │
│  Components:                                     │
│  ✓ 10 permission utilities                      │
│  ✓ 4 FastAPI dependencies                       │
│  ✓ 3 API endpoints                              │
│  ✓ 13 comprehensive tests                       │
│  ✓ 530 lines of documentation                   │
│                                                  │
│  Features:                                       │
│  ✓ Role hierarchy (custodian > contrib > view) │
│  ✓ Last custodian protection                    │
│  ✓ Comprehensive error handling                 │
│  ✓ Audit logging                                │
│  ✓ Security enforcement                         │
│                                                  │
│  Ready for:                                      │
│  → Frontend integration (Phase 3)               │
│  → Production deployment                         │
│                                                  │
└─────────────────────────────────────────────────┘
```
