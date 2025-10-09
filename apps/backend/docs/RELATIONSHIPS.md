## Relationship Management API Documentation

# Phase 2.7: Relationship Endpoints

Complete API reference for managing spouse and parent-child relationships in family trees.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
   - [Add Spouse](#add-spouse)
   - [Remove Spouse](#remove-spouse)
   - [Add Child](#add-child)
   - [Remove Child](#remove-child)
   - [Compute Relationship](#compute-relationship)
4. [Validation Rules](#validation-rules)
5. [Error Handling](#error-handling)
6. [Usage Examples](#usage-examples)
7. [Frontend Integration](#frontend-integration)

---

## Overview

The Relationship Management API provides endpoints for:

- **Spouse Management**: Add and remove spouse relationships with validation
- **Parent-Child Management**: Create family lineages with single or multiple parents
- **Relationship Computation**: Calculate relationships between any two members
- **Data Integrity**: Comprehensive validation against tree settings

### Key Features

✅ Bidirectional spouse relationships  
✅ Monogamy/polygamy validation  
✅ Max spouses per member constraint  
✅ Same-sex relationship support  
✅ Single-parent and multi-parent support  
✅ Max parents per child constraint  
✅ Circular relationship prevention  
✅ Custodian-only authorization  
✅ Relationship computation (spouse, parent, child, sibling, grandparent, cousin, in-law)

---

## Authentication

All relationship endpoints require authentication via JWT token:

```bash
Authorization: Bearer <access_token>
```

Or via HTTP-only cookie (automatically sent by browser):

```
Cookie: access_token=<token>
```

**Required Role**: `custodian` (for add/remove operations)  
**Read Access**: All roles can compute relationships

---

## API Endpoints

### Add Spouse

Create a bidirectional spouse relationship between two members.

**Endpoint**: `POST /api/members/{id}/spouse`

**Path Parameters**:

- `id` (UUID): Member ID

**Query Parameters**:

- `spouse_id` (UUID, required): UUID of the spouse to add

**Authorization**: Custodian only

**Validations**:

- Both members must exist and be in the same tree
- Checks monogamy constraint (if enabled)
- Validates max_spouses_per_member limit (if set)
- Validates same-sex relationships (if restricted)
- Prevents duplicate relationships
- Prevents self-relationships

**Request Example**:

```bash
curl -X POST "http://localhost:8000/api/members/123e4567-e89b-12d3-a456-426614174000/spouse?spouse_id=223e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Success Response** (201 Created):

```json
{
  "id": "323e4567-e89b-12d3-a456-426614174000",
  "tree_id": "423e4567-e89b-12d3-a456-426614174000",
  "type": "spouse",
  "a_member_id": "123e4567-e89b-12d3-a456-426614174000",
  "b_member_id": "223e4567-e89b-12d3-a456-426614174000",
  "created_at": "2025-10-01T12:00:00Z"
}
```

**Error Responses**:

```json
// 400 Bad Request - Monogamy violation
{
  "detail": "Monogamy enabled: Alice already has a spouse"
}

// 400 Bad Request - Max spouses reached
{
  "detail": "Bob has reached max spouses limit (2)"
}

// 400 Bad Request - Same-sex not allowed
{
  "detail": "Same-sex relationships are not allowed in this tree"
}

// 409 Conflict - Already exists
{
  "detail": "Spouse relationship already exists"
}

// 403 Forbidden
{
  "detail": "Insufficient permissions. Required: custodian, Your role: viewer"
}
```

---

### Remove Spouse

Remove a spouse relationship between two members.

**Endpoint**: `DELETE /api/members/{id}/spouse/{spouseId}`

**Path Parameters**:

- `id` (UUID): Member ID
- `spouseId` (UUID): Spouse ID to remove

**Authorization**: Custodian only

**Request Example**:

```bash
curl -X DELETE "http://localhost:8000/api/members/123e4567-e89b-12d3-a456-426614174000/spouse/223e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <token>"
```

**Success Response** (204 No Content):

```
(Empty body)
```

**Error Responses**:

```json
// 404 Not Found
{
  "detail": "Spouse relationship not found"
}

// 403 Forbidden
{
  "detail": "Insufficient permissions. Required: custodian, Your role: contributor"
}
```

---

### Add Child

Create parent-child relationship(s) with single or two-parent configuration.

**Endpoint**: `POST /api/members/{id}/children`

**Path Parameters**:

- `id` (UUID): Parent member ID

**Query Parameters**:

- `child_id` (UUID, required): UUID of the child to add
- `second_parent_id` (UUID, optional): UUID of the second parent

**Authorization**: Custodian only

**Validations**:

- All members must exist and be in the same tree
- Validates single-parent settings (if only one parent)
- Validates multi-parent settings (if more than 2 parents)
- Validates max_parents_per_child limit (if set)
- Prevents duplicate relationships
- Prevents circular relationships (child cannot be ancestor of parent)
- Prevents self-relationships

**Request Example** (Single Parent):

```bash
curl -X POST "http://localhost:8000/api/members/123e4567-e89b-12d3-a456-426614174000/children?child_id=323e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Request Example** (Two Parents):

```bash
curl -X POST "http://localhost:8000/api/members/123e4567-e89b-12d3-a456-426614174000/children?child_id=323e4567-e89b-12d3-a456-426614174000&second_parent_id=223e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Success Response** (201 Created):

```json
{
  "id": "423e4567-e89b-12d3-a456-426614174000",
  "tree_id": "523e4567-e89b-12d3-a456-426614174000",
  "type": "parent-child",
  "a_member_id": "123e4567-e89b-12d3-a456-426614174000",
  "b_member_id": "323e4567-e89b-12d3-a456-426614174000",
  "created_at": "2025-10-01T12:00:00Z"
}
```

**Error Responses**:

```json
// 400 Bad Request - Single parent not allowed
{
  "detail": "Single-parent children are not allowed in this tree. Please specify a second parent."
}

// 400 Bad Request - Too many parents
{
  "detail": "Children with more than 2 parents are not allowed in this tree"
}

// 400 Bad Request - Max parents limit
{
  "detail": "Child would exceed max parents limit (2)"
}

// 400 Bad Request - Circular relationship
{
  "detail": "Cannot create circular parent-child relationship"
}

// 409 Conflict - Already exists
{
  "detail": "Parent-child relationship already exists"
}
```

---

### Remove Child

Remove a parent-child relationship.

**Endpoint**: `DELETE /api/members/{id}/children/{childId}`

**Path Parameters**:

- `id` (UUID): Parent member ID
- `childId` (UUID): Child ID to remove

**Authorization**: Custodian only

**Note**: Only removes the relationship with this specific parent. Does not affect relationships with other parents.

**Request Example**:

```bash
curl -X DELETE "http://localhost:8000/api/members/123e4567-e89b-12d3-a456-426614174000/children/323e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <token>"
```

**Success Response** (204 No Content):

```
(Empty body)
```

**Error Responses**:

```json
// 404 Not Found
{
  "detail": "Parent-child relationship not found"
}

// 403 Forbidden
{
  "detail": "You do not have access to this tree"
}
```

---

### Compute Relationship

Calculate the relationship between two members in a tree.

**Endpoint**: `GET /api/relations/{treeId}/between`

**Path Parameters**:

- `treeId` (UUID): Tree ID

**Query Parameters**:

- `from` (UUID, required): UUID of the first member
- `to` (UUID, required): UUID of the second member

**Authorization**: Any role (viewer, contributor, custodian)

**Relationship Types Computed**:

- **Direct**: spouse, parent, child
- **Siblings**: full sibling, half sibling
- **Extended**: grandparent, grandchild (with "great-" prefix)
- **Aunts/Uncles**: parent's sibling
- **Nieces/Nephews**: sibling's child
- **Cousins**: 1st cousin, 2nd cousin, etc.
- **In-laws**: parent-in-law, sibling-in-law, step-child

**Request Example**:

```bash
curl -X GET "http://localhost:8000/api/relations/123e4567-e89b-12d3-a456-426614174000/between?from=223e4567-e89b-12d3-a456-426614174000&to=323e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <token>"
```

**Success Response** (200 OK):

```json
{
  "from_member_id": "223e4567-e89b-12d3-a456-426614174000",
  "from_member_name": "Alice",
  "to_member_id": "323e4567-e89b-12d3-a456-426614174000",
  "to_member_name": "Bob",
  "relationship": "sibling (full)",
  "path": [
    "223e4567-e89b-12d3-a456-426614174000",
    "423e4567-e89b-12d3-a456-426614174000",
    "323e4567-e89b-12d3-a456-426614174000"
  ],
  "path_names": ["Alice", "Parent", "Bob"]
}
```

**Relationship Examples**:

```json
// Spouse
{
  "relationship": "spouse",
  "path": ["alice_id", "bob_id"],
  "path_names": ["Alice", "Bob"]
}

// Parent
{
  "relationship": "parent",
  "path": ["child_id", "parent_id"],
  "path_names": ["Child", "Parent"]
}

// Grandparent
{
  "relationship": "grandparent",
  "path": ["grandchild_id", "parent_id", "grandparent_id"],
  "path_names": ["Grandchild", "Parent", "Grandparent"]
}

// Great-grandparent
{
  "relationship": "great-grandparent",
  "path": ["member_id", "parent_id", "grandparent_id", "great_grandparent_id"],
  "path_names": ["Member", "Parent", "Grandparent", "Great-Grandparent"]
}

// Sibling
{
  "relationship": "sibling (full)",
  "path": ["alice_id", "parent_id", "bob_id"],
  "path_names": ["Alice", "Parent", "Bob"]
}

// Aunt/Uncle
{
  "relationship": "aunt/uncle",
  "path": ["niece_id", "parent_id", "grandparent_id", "aunt_id"],
  "path_names": ["Niece", "Parent", "Grandparent", "Aunt"]
}

// Cousin
{
  "relationship": "1st cousin",
  "path": ["member1_id", "parent1_id", "grandparent_id", "parent2_id", "member2_id"],
  "path_names": ["Member1", "Parent1", "Grandparent", "Parent2", "Member2"]
}

// In-law
{
  "relationship": "parent-in-law",
  "path": ["member_id", "spouse_id", "parent_in_law_id"],
  "path_names": ["Member", "Spouse", "Parent-in-law"]
}

// No relationship
{
  "relationship": "no direct relationship",
  "path": ["alice_id", "bob_id"],
  "path_names": ["Alice", "Bob"]
}
```

**Error Responses**:

```json
// 404 Not Found - Tree
{
  "detail": "Tree not found"
}

// 404 Not Found - Member
{
  "detail": "From member not found in this tree"
}

// 403 Forbidden
{
  "detail": "You do not have access to this tree"
}
```

---

## Validation Rules

### Spouse Relationships

| Setting                     | Rule                  | Validation                 |
| --------------------------- | --------------------- | -------------------------- |
| `monogamy: true`            | Only 1 spouse allowed | Blocks second spouse       |
| `max_spouses_per_member: N` | Max N spouses         | Blocks N+1th spouse        |
| `allow_same_sex: false`     | Opposite sex only     | Blocks same gender spouses |

### Parent-Child Relationships

| Setting                              | Rule                | Validation                |
| ------------------------------------ | ------------------- | ------------------------- |
| `allow_single_parent: false`         | Must have 2 parents | Requires second_parent_id |
| `allow_multi_parent_children: false` | Max 2 parents       | Blocks 3rd+ parent        |
| `max_parents_per_child: N`           | Max N parents       | Blocks N+1th parent       |

### General Rules

✅ **Circular Relationships**: Prevented (child cannot be ancestor of parent)  
✅ **Self-Relationships**: Blocked (cannot be spouse/parent/child of self)  
✅ **Duplicate Relationships**: Prevented (same relationship cannot exist twice)  
✅ **Tree Isolation**: Members must be in same tree  
✅ **Bidirectional Consistency**: Spouse relationships are symmetric

---

## Error Handling

### HTTP Status Codes

| Code | Meaning     | Common Causes                           |
| ---- | ----------- | --------------------------------------- |
| 200  | OK          | Successful relationship computation     |
| 201  | Created     | Relationship successfully created       |
| 204  | No Content  | Relationship successfully deleted       |
| 400  | Bad Request | Validation failed, constraint violated  |
| 403  | Forbidden   | Insufficient permissions, wrong role    |
| 404  | Not Found   | Member, tree, or relationship not found |
| 409  | Conflict    | Relationship already exists             |

### Error Response Format

```json
{
  "detail": "Human-readable error message"
}
```

### Common Errors

**Monogamy Violation**:

```json
{
  "detail": "Monogamy enabled: Alice already has a spouse"
}
```

**Max Spouses Reached**:

```json
{
  "detail": "Bob has reached max spouses limit (3)"
}
```

**Single Parent Not Allowed**:

```json
{
  "detail": "Single-parent children are not allowed in this tree. Please specify a second parent."
}
```

**Circular Relationship**:

```json
{
  "detail": "Cannot create circular parent-child relationship"
}
```

**Insufficient Permissions**:

```json
{
  "detail": "Insufficient permissions. Required: custodian, Your role: contributor"
}
```

---

## Usage Examples

### Example 1: Create Monogamous Couple

```bash
# Add spouse (monogamy tree)
curl -X POST "http://localhost:8000/api/members/alice_id/spouse?spouse_id=bob_id" \
  -H "Authorization: Bearer $TOKEN"

# Response: 201 Created
{
  "id": "rel_id",
  "type": "spouse",
  "a_member_id": "alice_id",
  "b_member_id": "bob_id",
  "created_at": "2025-10-01T12:00:00Z"
}
```

### Example 2: Create Polygamous Union

```bash
# Tree settings: { monogamy: false, max_spouses_per_member: 3 }

# Add first spouse
curl -X POST "http://localhost:8000/api/members/david_id/spouse?spouse_id=eve_id" \
  -H "Authorization: Bearer $TOKEN"

# Add second spouse
curl -X POST "http://localhost:8000/api/members/david_id/spouse?spouse_id=fiona_id" \
  -H "Authorization: Bearer $TOKEN"

# David now has 2 spouses
```

### Example 3: Add Single-Parent Child

```bash
# Tree settings: { allow_single_parent: true }

# Add child with single parent
curl -X POST "http://localhost:8000/api/members/alice_id/children?child_id=charlie_id" \
  -H "Authorization: Bearer $TOKEN"

# Response: 201 Created
```

### Example 4: Add Two-Parent Child

```bash
# Add child with two parents
curl -X POST "http://localhost:8000/api/members/alice_id/children?child_id=charlie_id&second_parent_id=bob_id" \
  -H "Authorization: Bearer $TOKEN"

# Creates TWO relationships:
# 1. alice_id -> charlie_id (parent-child)
# 2. bob_id -> charlie_id (parent-child)
```

### Example 5: Compute Sibling Relationship

```bash
# Find relationship between two children with same parents
curl -X GET "http://localhost:8000/api/relations/tree_id/between?from=alice_id&to=bob_id" \
  -H "Authorization: Bearer $TOKEN"

# Response:
{
  "relationship": "sibling (full)",
  "path": ["alice_id", "parent_id", "bob_id"],
  "path_names": ["Alice", "Parent", "Bob"]
}
```

### Example 6: Remove Relationship

```bash
# Remove spouse
curl -X DELETE "http://localhost:8000/api/members/alice_id/spouse/bob_id" \
  -H "Authorization: Bearer $TOKEN"

# Remove child
curl -X DELETE "http://localhost:8000/api/members/alice_id/children/charlie_id" \
  -H "Authorization: Bearer $TOKEN"

# Response: 204 No Content
```

---

## Frontend Integration

### React Hook for Adding Spouse

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useAddSpouse(memberId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (spouseId: string) => {
      const response = await fetch(
        `/api/members/${memberId}/spouse?spouse_id=${spouseId}`,
        {
          method: 'POST',
          credentials: 'include', // Include cookies
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate member queries to refetch updated data
      queryClient.invalidateQueries(['member', memberId]);
      queryClient.invalidateQueries(['members']);
    },
  });
}

// Usage in component
function AddSpouseDialog({ memberId, onClose }) {
  const [spouseId, setSpouseId] = useState('');
  const addSpouse = useAddSpouse(memberId);

  const handleSubmit = () => {
    addSpouse.mutate(spouseId, {
      onSuccess: () => {
        toast.success('Spouse added successfully!');
        onClose();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <Dialog>
      <Select value={spouseId} onChange={setSpouseId}>
        {/* Member options */}
      </Select>
      <Button onClick={handleSubmit} disabled={addSpouse.isLoading}>
        Add Spouse
      </Button>
    </Dialog>
  );
}
```

### React Hook for Adding Child

```typescript
function useAddChild(parentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      childId,
      secondParentId,
    }: {
      childId: string;
      secondParentId?: string;
    }) => {
      let url = `/api/members/${parentId}/children?child_id=${childId}`;
      if (secondParentId) {
        url += `&second_parent_id=${secondParentId}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['member', parentId]);
      queryClient.invalidateQueries(['members']);
    },
  });
}
```

### React Hook for Computing Relationship

```typescript
function useComputeRelationship(treeId: string) {
  return useQuery({
    queryKey: ['relationship', treeId, fromId, toId],
    queryFn: async () => {
      const response = await fetch(
        `/api/relations/${treeId}/between?from=${fromId}&to=${toId}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to compute relationship');
      }

      return response.json();
    },
    enabled: !!fromId && !!toId,
  });
}

// Usage in component
function RelationshipDisplay({ treeId, fromId, toId }) {
  const { data, isLoading } = useComputeRelationship(treeId, fromId, toId);

  if (isLoading) return <Spinner />;

  return (
    <div>
      <p>{data.from_member_name} is {data.relationship} of {data.to_member_name}</p>
      <p>Path: {data.path_names.join(' → ')}</p>
    </div>
  );
}
```

### Error Handling Component

```typescript
function RelationshipForm({ onSubmit, error }) {
  return (
    <form onSubmit={onSubmit}>
      {/* Form fields */}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error.message}
          </AlertDescription>
        </Alert>
      )}

      <Button type="submit">Submit</Button>
    </form>
  );
}
```

---

## Testing

### Manual Testing with curl

```bash
# Set token
TOKEN="your_jwt_token_here"

# Test add spouse
curl -X POST "http://localhost:8000/api/members/<member_id>/spouse?spouse_id=<spouse_id>" \
  -H "Authorization: Bearer $TOKEN"

# Test compute relationship
curl -X GET "http://localhost:8000/api/relations/<tree_id>/between?from=<from_id>&to=<to_id>" \
  -H "Authorization: Bearer $TOKEN"

# Test remove spouse
curl -X DELETE "http://localhost:8000/api/members/<member_id>/spouse/<spouse_id>" \
  -H "Authorization: Bearer $TOKEN"
```

### Automated Testing

Run the test suite:

```bash
cd /mnt/win3/work/family_tree/apps/backend
python test_relationships.py
```

Tests cover:

- Spouse management (monogamy/polygamy)
- Child management (single/two parent)
- Relationship removal
- Relationship computation
- Constraint validation
- Error handling

---

## Summary

Phase 2.7 implements comprehensive relationship management with:

✅ **5 API Endpoints**: Add/remove spouse, add/remove child, compute relationship  
✅ **Robust Validation**: Monogamy, polygamy, same-sex, parent limits  
✅ **Data Integrity**: Circular relationship prevention, duplicate detection  
✅ **Authorization**: Custodian-only for mutations, all roles for queries  
✅ **Relationship Computation**: 10+ relationship types with path finding  
✅ **Error Handling**: Clear, actionable error messages  
✅ **Test Coverage**: 7 automated tests covering all scenarios

**Next Phase**: 2.8 Invitation System

---

_Last Updated: October 1, 2025_
