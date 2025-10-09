# Member Management API Documentation

Complete guide to the Member Management endpoints (Phase 2.6) for creating, reading, updating, and deleting family tree members.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [List Members](#list-members)
  - [Get Member](#get-member)
  - [Create Member](#create-member)
  - [Update Member](#update-member)
  - [Delete Member](#delete-member)
- [Pagination](#pagination)
- [Filtering & Search](#filtering--search)
- [Authorization](#authorization)
- [Error Handling](#error-handling)
- [Examples](#examples)
- [Frontend Integration](#frontend-integration)

---

## Overview

The Member Management API provides comprehensive CRUD (Create, Read, Update, Delete) operations for managing family tree members. All endpoints require authentication and enforce role-based access control.

### Key Features

- **Cursor-based pagination** for efficient scrolling through large member lists
- **Filtering** by alive/deceased status
- **Case-insensitive search** by member name
- **Role-based authorization** (custodian-only for mutations)
- **Automatic relationship cleanup** when deleting members
- **Input validation** against tree settings
- **Audit tracking** with updated_by field

### Base URL

```
http://localhost:8050/api
```

---

## Authentication

All endpoints require authentication via JWT token in HttpOnly cookie or Bearer token in Authorization header.

```bash
# Cookie-based (automatic after OTP login)
curl -X GET http://localhost:8050/api/members/{id} \
  --cookie "session=YOUR_JWT_TOKEN"

# Bearer token
curl -X GET http://localhost:8050/api/members/{id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Endpoints

### List Members

Get a paginated list of members in a tree with optional filtering and search.

**Endpoint:** `GET /api/trees/{tree_id}/members`

**Authorization:** Any role (viewer, contributor, custodian)

**Query Parameters:**

| Parameter | Type   | Required | Description                             |
| --------- | ------ | -------- | --------------------------------------- |
| cursor    | string | No       | Cursor for pagination (member ID)       |
| limit     | int    | No       | Results per page (1-200, default: 50)   |
| status    | string | No       | Filter by status: 'alive' or 'deceased' |
| search    | string | No       | Case-insensitive search by member name  |

**Response:** `200 OK`

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "tree_id": "123e4567-e89b-12d3-a456-426614174001",
    "name": "John Doe",
    "email": "john@example.com",
    "dob": "1990-01-15",
    "gender": "male",
    "deceased": false,
    "notes": "Family patriarch",
    "created_at": "2025-01-01T10:00:00Z",
    "updated_at": "2025-01-15T14:30:00Z",
    "updated_by": "123e4567-e89b-12d3-a456-426614174002"
  }
]
```

**Example Request:**

```bash
# Get first page (50 members)
curl -X GET "http://localhost:8050/api/trees/TREE_ID/members" \
  --cookie "session=YOUR_JWT_TOKEN"

# Get next page using cursor
curl -X GET "http://localhost:8050/api/trees/TREE_ID/members?cursor=LAST_MEMBER_ID&limit=50" \
  --cookie "session=YOUR_JWT_TOKEN"

# Filter by status
curl -X GET "http://localhost:8050/api/trees/TREE_ID/members?status=deceased" \
  --cookie "session=YOUR_JWT_TOKEN"

# Search by name
curl -X GET "http://localhost:8050/api/trees/TREE_ID/members?search=John" \
  --cookie "session=YOUR_JWT_TOKEN"

# Combine filters
curl -X GET "http://localhost:8050/api/trees/TREE_ID/members?status=alive&search=Smith&limit=20" \
  --cookie "session=YOUR_JWT_TOKEN"
```

**JavaScript Example:**

```javascript
async function listMembers(treeId, options = {}) {
  const params = new URLSearchParams();

  if (options.cursor) params.append('cursor', options.cursor);
  if (options.limit) params.append('limit', options.limit);
  if (options.status) params.append('status', options.status);
  if (options.search) params.append('search', options.search);

  const response = await fetch(`/api/trees/${treeId}/members?${params}`, {
    credentials: 'include', // Include cookies
  });

  if (!response.ok) {
    throw new Error(`Failed to list members: ${response.status}`);
  }

  return await response.json();
}

// Usage
const members = await listMembers('tree-id-123', {
  status: 'alive',
  search: 'Smith',
  limit: 20,
});
```

---

### Get Member

Get detailed information about a specific member.

**Endpoint:** `GET /api/members/{member_id}`

**Authorization:** Any role (viewer, contributor, custodian)

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| member_id | UUID | Yes      | Member ID   |

**Response:** `200 OK`

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "tree_id": "123e4567-e89b-12d3-a456-426614174001",
  "name": "John Doe",
  "email": "john@example.com",
  "dob": "1990-01-15",
  "gender": "male",
  "deceased": false,
  "notes": "Family patriarch",
  "created_at": "2025-01-01T10:00:00Z",
  "updated_at": "2025-01-15T14:30:00Z",
  "updated_by": "123e4567-e89b-12d3-a456-426614174002"
}
```

**Example Request:**

```bash
curl -X GET "http://localhost:8050/api/members/MEMBER_ID" \
  --cookie "session=YOUR_JWT_TOKEN"
```

**JavaScript Example:**

```javascript
async function getMember(memberId) {
  const response = await fetch(`/api/members/${memberId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to get member: ${response.status}`);
  }

  return await response.json();
}

// Usage
const member = await getMember('member-id-123');
console.log(member.name); // "John Doe"
```

---

### Create Member

Create a new member in a tree.

**Endpoint:** `POST /api/trees/{tree_id}/members`

**Authorization:** Custodian only

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| tree_id   | UUID | Yes      | Tree ID     |

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "dob": "1990-01-15",
  "gender": "male",
  "deceased": false,
  "notes": "Family patriarch"
}
```

**Field Descriptions:**

| Field    | Type    | Required | Description                          |
| -------- | ------- | -------- | ------------------------------------ |
| name     | string  | Yes      | Member's full name                   |
| email    | string  | No       | Email address (validated)            |
| dob      | string  | No       | Date of birth (ISO 8601: YYYY-MM-DD) |
| gender   | string  | No       | Gender identity                      |
| deceased | boolean | No       | Deceased status (default: false)     |
| notes    | string  | No       | Additional notes or biography        |

**Response:** `201 Created`

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "tree_id": "123e4567-e89b-12d3-a456-426614174001",
  "name": "John Doe",
  "email": "john@example.com",
  "dob": "1990-01-15",
  "gender": "male",
  "deceased": false,
  "notes": "Family patriarch",
  "created_at": "2025-01-01T10:00:00Z",
  "updated_at": "2025-01-01T10:00:00Z",
  "updated_by": "123e4567-e89b-12d3-a456-426614174002"
}
```

**Example Request:**

```bash
curl -X POST "http://localhost:8050/api/trees/TREE_ID/members" \
  -H "Content-Type: application/json" \
  --cookie "session=YOUR_JWT_TOKEN" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "dob": "1985-03-20",
    "gender": "female",
    "deceased": false
  }'
```

**JavaScript Example:**

```javascript
async function createMember(treeId, memberData) {
  const response = await fetch(`/api/trees/${treeId}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(memberData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create member');
  }

  return await response.json();
}

// Usage
const newMember = await createMember('tree-id-123', {
  name: 'Jane Smith',
  email: 'jane@example.com',
  dob: '1985-03-20',
  gender: 'female',
  deceased: false,
  notes: 'Mother of two',
});
```

---

### Update Member

Update an existing member's information.

**Endpoint:** `PATCH /api/members/{member_id}`

**Authorization:** Custodian only

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| member_id | UUID | Yes      | Member ID   |

**Request Body:** (All fields optional)

```json
{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "dob": "1990-01-15",
  "gender": "male",
  "deceased": true,
  "notes": "Updated biography"
}
```

**Response:** `200 OK`

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "tree_id": "123e4567-e89b-12d3-a456-426614174001",
  "name": "John Smith",
  "email": "john.smith@example.com",
  "dob": "1990-01-15",
  "gender": "male",
  "deceased": true,
  "notes": "Updated biography",
  "created_at": "2025-01-01T10:00:00Z",
  "updated_at": "2025-01-20T16:45:00Z",
  "updated_by": "123e4567-e89b-12d3-a456-426614174002"
}
```

**Example Request:**

```bash
curl -X PATCH "http://localhost:8050/api/members/MEMBER_ID" \
  -H "Content-Type: application/json" \
  --cookie "session=YOUR_JWT_TOKEN" \
  -d '{
    "deceased": true,
    "notes": "Passed away on 2025-01-15"
  }'
```

**JavaScript Example:**

```javascript
async function updateMember(memberId, updates) {
  const response = await fetch(`/api/members/${memberId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update member');
  }

  return await response.json();
}

// Usage
const updated = await updateMember('member-id-123', {
  deceased: true,
  notes: 'Passed away peacefully',
});
```

---

### Delete Member

Delete a member from the tree. This operation:

- Removes the member record
- Deletes all relationships involving this member (spouse, parent-child, etc.)
- Cannot be undone

**Endpoint:** `DELETE /api/members/{member_id}`

**Authorization:** Custodian only

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| member_id | UUID | Yes      | Member ID   |

**Response:** `204 No Content`

**Example Request:**

```bash
curl -X DELETE "http://localhost:8050/api/members/MEMBER_ID" \
  --cookie "session=YOUR_JWT_TOKEN"
```

**JavaScript Example:**

```javascript
async function deleteMember(memberId) {
  const response = await fetch(`/api/members/${memberId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete member');
  }

  // 204 response has no body
  return true;
}

// Usage with confirmation
if (confirm('Are you sure you want to delete this member?')) {
  await deleteMember('member-id-123');
  console.log('Member deleted successfully');
}
```

---

## Pagination

### Cursor-Based Pagination

The API uses cursor-based pagination for efficient scrolling through large datasets. This approach:

- **Stable results:** Works correctly even when data changes during pagination
- **Efficient:** Doesn't slow down for large offsets
- **Consistent:** Ensures no duplicates or missing items

### How It Works

1. Request the first page without a cursor:

   ```
   GET /api/trees/{id}/members?limit=50
   ```

2. The response contains up to 50 members, ordered by `created_at` and `id`:

   ```json
   [
     {"id": "member-1", "name": "Alice", "created_at": "..."},
     {"id": "member-2", "name": "Bob", "created_at": "..."},
     ...
     {"id": "member-50", "name": "Zoe", "created_at": "..."}
   ]
   ```

3. To get the next page, use the ID of the last member as the cursor:

   ```
   GET /api/trees/{id}/members?cursor=member-50&limit=50
   ```

4. Repeat until you receive fewer results than the limit (indicating the last page)

### Pagination Example

```javascript
async function getAllMembers(treeId) {
  const allMembers = [];
  let cursor = null;
  const limit = 50;

  while (true) {
    const params = new URLSearchParams({ limit });
    if (cursor) params.append('cursor', cursor);

    const response = await fetch(`/api/trees/${treeId}/members?${params}`, {
      credentials: 'include',
    });

    const members = await response.json();
    allMembers.push(...members);

    // Check if we've reached the end
    if (members.length < limit) {
      break;
    }

    // Set cursor to last member's ID
    cursor = members[members.length - 1].id;
  }

  return allMembers;
}
```

---

## Filtering & Search

### Status Filter

Filter members by their deceased status:

```bash
# Get only living members
GET /api/trees/{id}/members?status=alive

# Get only deceased members
GET /api/trees/{id}/members?status=deceased
```

### Name Search

Case-insensitive search across member names:

```bash
# Find all members with "Smith" in their name
GET /api/trees/{id}/members?search=Smith

# Find all "John"s
GET /api/trees/{id}/members?search=john
```

### Combined Filters

Filters can be combined:

```bash
# Find living members named Smith
GET /api/trees/{id}/members?status=alive&search=Smith

# Search with pagination
GET /api/trees/{id}/members?search=Smith&limit=20&cursor=MEMBER_ID
```

### React Component Example

```jsx
import { useState, useEffect } from 'react';

function MemberList({ treeId }) {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (status !== 'all') params.append('status', status);

        const response = await fetch(`/api/trees/${treeId}/members?${params}`, {
          credentials: 'include',
        });

        const data = await response.json();
        setMembers(data);
      } catch (error) {
        console.error('Failed to fetch members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [treeId, search, status]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search members..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="all">All</option>
        <option value="alive">Living</option>
        <option value="deceased">Deceased</option>
      </select>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {members.map((member) => (
            <li key={member.id}>
              {member.name}
              {member.deceased && ' (Deceased)'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Authorization

### Role-Based Access Control

| Endpoint      | Viewer | Contributor | Custodian |
| ------------- | ------ | ----------- | --------- |
| List Members  | ✓      | ✓           | ✓         |
| Get Member    | ✓      | ✓           | ✓         |
| Create Member | ✗      | ✗           | ✓         |
| Update Member | ✗      | ✗           | ✓         |
| Delete Member | ✗      | ✗           | ✓         |

### Role Hierarchy

Roles have a hierarchy where higher roles include all permissions of lower roles:

```
Custodian (level 3)
    ↓
Contributor (level 2)
    ↓
Viewer (level 1)
```

### Access Checks

The API performs two levels of access checks:

1. **Tree Access:** User must be a member of the tree
2. **Role Check:** User must have sufficient role level for the operation

Example error responses:

```json
// Not a member of the tree
{
  "detail": "You do not have access to this tree"
}

// Insufficient role
{
  "detail": "Requires custodian role or higher"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning               | When It Occurs                   |
| ---- | --------------------- | -------------------------------- |
| 200  | OK                    | Successful GET/PATCH request     |
| 201  | Created               | Successful POST request          |
| 204  | No Content            | Successful DELETE request        |
| 400  | Bad Request           | Invalid input (validation error) |
| 401  | Unauthorized          | Not authenticated                |
| 403  | Forbidden             | Insufficient permissions         |
| 404  | Not Found             | Member or tree doesn't exist     |
| 422  | Unprocessable Entity  | Validation error (Pydantic)      |
| 500  | Internal Server Error | Server-side error                |

### Error Response Format

```json
{
  "detail": "Human-readable error message"
}
```

### Validation Errors

For 422 errors (Pydantic validation):

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

### Error Handling Example

```javascript
async function handleMemberOperation(operation) {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const data = await error.response.json();

      switch (status) {
        case 400:
          return { success: false, error: 'Invalid input', details: data.detail };
        case 401:
          return { success: false, error: 'Please log in', details: data.detail };
        case 403:
          return { success: false, error: 'Permission denied', details: data.detail };
        case 404:
          return { success: false, error: 'Not found', details: data.detail };
        default:
          return { success: false, error: 'Operation failed', details: data.detail };
      }
    }

    return { success: false, error: 'Network error' };
  }
}

// Usage
const result = await handleMemberOperation(() => createMember('tree-id', memberData));

if (result.success) {
  console.log('Member created:', result.data);
} else {
  console.error('Error:', result.error, result.details);
}
```

---

## Examples

### Complete CRUD Workflow

```javascript
// 1. Create a new member
const john = await createMember('tree-id-123', {
  name: 'John Doe',
  email: 'john@example.com',
  dob: '1990-01-15',
  gender: 'male',
});
console.log('Created:', john.id);

// 2. Get the member
const member = await getMember(john.id);
console.log('Name:', member.name);

// 3. Update the member
const updated = await updateMember(john.id, {
  notes: 'Family historian',
});
console.log('Updated notes:', updated.notes);

// 4. List members
const members = await listMembers('tree-id-123', {
  search: 'John',
  status: 'alive',
});
console.log('Found:', members.length, 'members');

// 5. Delete the member
await deleteMember(john.id);
console.log('Member deleted');
```

### Paginated List with React Query

```jsx
import { useInfiniteQuery } from '@tanstack/react-query';

function InfiniteMemberList({ treeId }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['members', treeId],
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams({ limit: 20 });
      if (pageParam) params.append('cursor', pageParam);

      const response = await fetch(`/api/trees/${treeId}/members?${params}`, {
        credentials: 'include',
      });

      return response.json();
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < 20) return undefined;
      return lastPage[lastPage.length - 1].id;
    },
  });

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      ))}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

---

## Frontend Integration

### React Hooks

```javascript
// hooks/useMembers.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useMembers(treeId, options = {}) {
  return useQuery({
    queryKey: ['members', treeId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);
      if (options.search) params.append('search', options.search);

      const response = await fetch(`/api/trees/${treeId}/members?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch members');
      return response.json();
    },
  });
}

export function useMember(memberId) {
  return useQuery({
    queryKey: ['member', memberId],
    queryFn: async () => {
      const response = await fetch(`/api/members/${memberId}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch member');
      return response.json();
    },
  });
}

export function useCreateMember(treeId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberData) => {
      const response = await fetch(`/api/trees/${treeId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(memberData),
      });

      if (!response.ok) throw new Error('Failed to create member');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['members', treeId]);
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, updates }) => {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update member');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['member', data.id]);
      queryClient.invalidateQueries(['members', data.tree_id]);
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId) => {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete member');
    },
    onSuccess: (_, memberId) => {
      queryClient.invalidateQueries(['member', memberId]);
      queryClient.invalidateQueries(['members']);
    },
  });
}
```

### Usage in Components

```jsx
import { useMembers, useCreateMember, useUpdateMember, useDeleteMember } from './hooks/useMembers';

function MemberManagement({ treeId }) {
  const [search, setSearch] = useState('');
  const { data: members, isLoading } = useMembers(treeId, { search });
  const createMember = useCreateMember(treeId);
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const handleCreate = async (formData) => {
    try {
      await createMember.mutateAsync(formData);
      toast.success('Member created successfully');
    } catch (error) {
      toast.error('Failed to create member');
    }
  };

  const handleUpdate = async (memberId, updates) => {
    try {
      await updateMember.mutateAsync({ memberId, updates });
      toast.success('Member updated successfully');
    } catch (error) {
      toast.error('Failed to update member');
    }
  };

  const handleDelete = async (memberId) => {
    if (!confirm('Are you sure?')) return;

    try {
      await deleteMember.mutateAsync(memberId);
      toast.success('Member deleted successfully');
    } catch (error) {
      toast.error('Failed to delete member');
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <MemberSearchBar value={search} onChange={setSearch} />
      <MemberList members={members} onUpdate={handleUpdate} onDelete={handleDelete} />
      <CreateMemberForm onSubmit={handleCreate} />
    </div>
  );
}
```

---

## Testing

Run the comprehensive test suite:

```bash
cd /mnt/win3/work/family_tree/apps/backend
python test_member_management.py
```

The test script covers:

- Authentication flow
- Creating a test tree
- Creating members
- Getting member details
- Updating members
- Listing with pagination
- Filtering by status
- Searching by name
- Cursor-based pagination
- Deleting members
- Authorization checks

---

## Summary

The Member Management API provides a robust, efficient, and secure system for managing family tree members with:

✅ **Cursor-based pagination** for handling large datasets  
✅ **Flexible filtering and search** capabilities  
✅ **Role-based authorization** protecting sensitive operations  
✅ **Automatic relationship cleanup** preventing orphaned data  
✅ **Input validation** ensuring data integrity  
✅ **Audit tracking** with updated_by field  
✅ **Comprehensive error handling** for better UX

All endpoints are production-ready and thoroughly tested.
